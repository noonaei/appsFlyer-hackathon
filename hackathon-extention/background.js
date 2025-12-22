import { startSession, stopSession } from './tracker.js';
import { maybeEmitSearchSignal } from './searchDetector.js';
import { enqueueSignal } from './eventQueue.js';

console.log('Service worker loaded');

async function handleActiveTabChange(tabId, windowId) {
  await stopSession('tab change');

  const tab = await chrome.tabs.get(tabId);
  if (tab.windowId !== windowId) return;

  await startSession(tab);
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Installed');
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('Startup');
  await stopSession('browser restart');
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  await handleActiveTabChange(tabId, windowId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    maybeEmitSearchSignal(changeInfo.url);
  }

  if (!tab.active || !changeInfo.url) return;

  await stopSession('url change');
  await startSession(tab);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const session = await chrome.storage.local.get('currentSession');
  if (session?.currentSession?.tabId === tabId) {
    await stopSession('tab closed');
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await stopSession('window blur');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab) {
    await startSession(tab);
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'hashtag_signal') {
    enqueueSignal({
      type: 'content_hashtags',
      timestamp: msg.timestamp,
      platform: msg.platform,
      hashtags: msg.hashtags,
      url: msg.url
    });
  }
});