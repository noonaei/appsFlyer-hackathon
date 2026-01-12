// background.js
import { enqueueSignal, getBatch, removeBatch, queueSize } from './eventQueue.js';
import { getDeviceToken } from './storage.js';

console.log('[BG] ========== SERVICE WORKER STARTED ==========');
console.log('[BG] Timestamp:', new Date().toISOString());

const UPLOAD_ENDPOINT = "http://localhost:5000/api/signals/add";
const BATCH_SIZE = 100;
const UPLOAD_INTERVAL_MS = 30_000; // 15 seconds

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

    // Group by: deviceToken + platform + kind
    const grouped = {};
    batch.forEach(signal => {
      const key = `${signal.deviceToken}|${signal.platform}|${signal.kind}`;
      
      if (!grouped[key]) {
       grouped[key] = {
         deviceToken: signal.deviceToken,
         platform: signal.platform,
         kind: signal.kind,
         labels: [],
         timestamp: new Date().toISOString()
       };
      }
      
      grouped[key].labels.push(signal.label);
    });

    console.log('[BG] Grouped into', Object.keys(grouped).length, 'requests');

    // Send each grouped request
    let totalSent = 0;
    for (const [key, payload] of Object.entries(grouped)) {
      console.log('[BG] Sending request:', payload.platform, payload.kind, `(${payload.labels.length} items)`);
      console.log('[BG!!!!!!!!!!] About to send this payload:', JSON.stringify(payload, null, 2));

      const res = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error('[BG] Upload failed for', key, ':', res.status);
        return; // Don't remove batch if any upload fails
      }

      totalSent += payload.labels.length;
    }

    // Only remove batch after all successful uploads
    await removeBatch(batch.length);
    await chrome.storage.local.set({ queueDirty: false });

    console.log('[BG] Successfully sent', totalSent, 'total items');
  } catch (err) {
    console.error('[BG] Upload batch error:', err);
  }
}

// Run upload every interval
setInterval(uploadBatch, UPLOAD_INTERVAL_MS);

// Handle signal batch messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[BG] Incoming message:', request);

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
      console.warn('[BG] No device token found in storage');
      sendResponse({ success: false, error: 'No device token' });
      return;
    }

    try {
      console.log(
        `[BG] Enqueuing ${payload.labels.length} labels for`,
        payload.platform,
        payload.kind
      );

      for (const label of payload.labels) {
        await enqueueSignal({
          deviceToken,
          platform: payload.platform,
          kind: payload.kind,
          label,
          timestamp: payload.timestamp || new Date().toISOString()
        });
      }

      console.log('[BG] queueDirty set to TRUE');
      await chrome.storage.local.set({ queueDirty: true });

      sendResponse({ success: true });
    } catch (error) {
      console.error('[BG] Failed to enqueue signals:', error);
      sendResponse({ success: false, error: error.message });
    }
  });

  return true; // keep message channel open
});


// Record URL visits
async function recordUrlVisit(tab) {
  if (!tab?.url || tab.url.startsWith('chrome://')) return;

  const deviceToken = await getDeviceToken();
  if (!deviceToken) return;

  const platform = inferPlatform(tab.url);
  
  enqueueSignal({
    deviceToken,
    platform,
    kind: 'url_visit',
    label: new URL(tab.url).hostname,
    url: tab.url,
    timestamp: Date.now()
  });
}

// Helper to map URL → platform enum
function inferPlatform(url) {
  if (!url) return 'unknown';
  if (url.includes('youtube.com')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('reddit.com')) return 'reddit';
  if (url.includes('google.com/search')) return 'google_search';
  return 'unknown';
}

// Extension installed
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[BG] Extension installed');
  }
});