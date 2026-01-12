// background.js
import { enqueueSignal, getBatch, removeBatch, queueSize } from './eventQueue.js';
import { getDeviceToken } from './storage.js';

console.log('[BG] ========== SERVICE WORKER STARTED ==========');
console.log('[BG] Timestamp:', new Date().toISOString());

// These will be loaded from server config
let CONFIG_ENDPOINT = null;
let UPLOAD_ENDPOINT = 'http://localhost:5000/api/signals/add'; // Default fallback
const BATCH_SIZE = 100;
const UPLOAD_INTERVAL_MS = 5_000; // 30 seconds

// Try to detect server from extension storage or use default discovery
async function detectServerEndpoint() {
  try {
    // First check if we have a saved config
    const stored = await chrome.storage.local.get(['serverUrl']);
    if (stored.serverUrl) {
      return stored.serverUrl;
    }
    
    // Try common localhost ports
    const ports = [4000, 5000, 3000, 8000, 8080];
    for (const port of ports) {
      try {
        const url = `http://localhost:${port}/api/config`;
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          console.log('[BG] Found server at port:', port);
          return `http://localhost:${port}`;
        }
      } catch (e) {
        // Continue to next port
      }
    }
    
    // Fallback to default
    return 'http://localhost:5000';
  } catch (err) {
    console.error('[BG] Error detecting server:', err);
    return 'http://localhost:5000';
  }
}

// Map KIND from content script to server kind
//minimal fixes to match server enum
const KIND_MAP = {
  'video_titles': 'video_titles',
  'VideoTitles': 'video_titles',
  'creators': 'creators',
  'Creators': 'creators',
  'hashtag': 'hashtag',
  'Hashtag': 'hashtag',
  'Hashtags': 'hashtag',
  'SubReddits': 'channel',    
  'subreddits': 'channel'
};
// Dynamic endpoint - will be loaded from server
let serverUrl = null;

// Fetch config from server on startup
async function loadConfig() {
  try {
    // Auto-detect server
    serverUrl = await detectServerEndpoint();
    CONFIG_ENDPOINT = `${serverUrl}/api/config`;
    
    console.log('[BG] Fetching config from:', CONFIG_ENDPOINT);
    const res = await fetch(CONFIG_ENDPOINT);
    
    if (!res.ok) {
      console.warn('[BG] Failed to fetch config:', res.status);
      UPLOAD_ENDPOINT = `${serverUrl}/api/signals/add`;
      console.log('[BG] Using fallback endpoint:', UPLOAD_ENDPOINT);
      return;
    }
    
    const config = await res.json();
    UPLOAD_ENDPOINT = config.uploadEndpoint || `${serverUrl}/api/signals/add`;
    console.log('[BG] Loaded endpoint from server:', UPLOAD_ENDPOINT);
    
    // Save for next time
    await chrome.storage.local.set({ 
      uploadEndpoint: UPLOAD_ENDPOINT,
      serverUrl: serverUrl
    });
  } catch (err) {
    console.error('[BG] Error loading config:', err);
    // Fallback
    const fallbackServer = await detectServerEndpoint();
    UPLOAD_ENDPOINT = `${fallbackServer}/api/signals/add`;
    console.log('[BG] Using fallback endpoint:', UPLOAD_ENDPOINT);
  }
}

// Load config on startup
loadConfig();

// Initialize queueDirty flag
chrome.storage.local.get('queueDirty', (result) => {
  if (result.queueDirty === undefined) {
    chrome.storage.local.set({ queueDirty: false });
  }
});

// Upload batch to server
async function uploadBatch() {
  try {
    const result = await chrome.storage.local.get('queueDirty');
    const queueDirty = result?.queueDirty;

    if (!queueDirty) return;

    const size = await queueSize();
    if (!size) {
      await chrome.storage.local.set({ queueDirty: false });
      return;
    }

    const batch = await getBatch(BATCH_SIZE);
    if (!batch.length) return;

    console.log('[BG] Processing batch of', batch.length, 'signals');

    // Get deviceToken from first signal
    const deviceToken = batch[0]?.deviceToken;
    if (!deviceToken) {
      console.error('[BG] No deviceToken in batch');
      return;
    }

    // Group signals by platform and kind
    const grouped = {};
    batch.forEach(signal => {
      const key = `${signal.platform}|${signal.kind}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          platform: signal.platform,
          kind: KIND_MAP[signal.kind] || signal.kind,
          labels: [],
          timestamp: new Date().toISOString()
        };
      }
      
      grouped[key].labels.push(signal.label);
    });

    // Convert to array format
    const payload = Object.values(grouped);

    console.log('[BG] Sending', payload.length, 'signal groups');
    
    const requestBody = {
      deviceToken: deviceToken,
      signals: payload
    };
    
    console.log('[BG] Full request body:', JSON.stringify(requestBody, null, 2));

    const res = await fetch(UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseBody = await res.text();
    console.log('[BG] Response status:', res.status);
    console.log('[BG] Response body:', responseBody);

    if (!res.ok) {
      console.error('[BG] Upload failed:', res.status, res.statusText);
      return;
    }

    console.log('[BG] Upload successful');

    // Only remove batch after successful upload
    await removeBatch(batch.length);
    await chrome.storage.local.set({ queueDirty: false });

    console.log('[BG] Successfully sent', batch.length, 'signals');
  } catch (err) {
    console.error('[BG] Upload batch error:', err);
  }
}

// Run upload every interval
setInterval(uploadBatch, UPLOAD_INTERVAL_MS);

// Handle signal batch messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== 'signal_batch') {
    return;
  }

  const { payload } = request;

  if (
    !payload ||
    !payload.platform ||
    !payload.kind ||
    !Array.isArray(payload.labels) ||
    payload.labels.length === 0
  ) {
    console.warn('[BG] Invalid signal_batch payload:', payload);
    sendResponse({ success: false, error: 'Invalid payload' });
    return;
  }

  chrome.storage.local.get(['deviceToken'], async (result) => {
    const deviceToken = result?.deviceToken;

    if (!deviceToken) {
      console.warn('[BG] No device token found');
      sendResponse({ success: false, error: 'No device token' });
      return;
    }

    try {
      console.log(
        `[BG] Enqueuing ${payload.labels.length} labels for ${payload.platform} / ${payload.kind}`
      );

      // Enqueue each label as a separate signal (for deduplication)
      for (const label of payload.labels) {
        await enqueueSignal({
          deviceToken,
          platform: payload.platform,
          kind: payload.kind,
          label: label,
          timestamp: payload.timestamp || Date.now()
        });
      }

      console.log('[BG] Setting queueDirty to TRUE');
      await chrome.storage.local.set({ queueDirty: true });

      sendResponse({ success: true });
    } catch (error) {
      console.error('[BG] Failed to enqueue signals:', error);
      sendResponse({ success: false, error: error.message });
    }
  });

  return true;
});

// Extension installed
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[BG] Extension installed');
  }
});