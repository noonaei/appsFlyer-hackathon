import { storage } from './storage.js';
import { enqueueSignal } from './eventQueue.js';

export async function stopSession(reason = '') {
  const session = await storage.get('currentSession');
  if (!session) return;

  const endTime = Date.now();
  const duration = endTime - session.startTime;

  if (duration > 5000) { // ignore micro-noise
    await enqueueSignal({
      type: 'page_focus',
      timestamp: endTime,
      domain: session.domain,
      url: session.url,
      durationMs: duration,
      platform: session.platform,
      reason
    });
  }

  await storage.remove('currentSession');
}
export async function startSession(tab) {
  if (!tab || !tab.url || tab.url.startsWith('chrome')) return;

  const session = {
    tabId: tab.id,
    windowId: tab.windowId,
    url: tab.url,
    domain: new URL(tab.url).hostname,
    platform: navigator.platform,
    startTime: Date.now()
  };

  await storage.set({ currentSession: session });
  console.log('Session started:', session);
}

