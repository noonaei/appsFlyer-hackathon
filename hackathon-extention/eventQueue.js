import { storage } from './storage.js';

const QUEUE_KEY = 'eventQueue';
const MAX_QUEUE_SIZE = 100;

export async function enqueueSignal(signal) {
  const {
    deviceToken,
    platform,
    kind,
    label,
    url,
    creator,
    timestamp
  } = signal;

  if (!deviceToken || !platform || !kind || !label) {
    console.warn('[QUEUE] Invalid signal dropped', signal);
    return;
  }

  const normalized = {
    deviceToken,
    platform,     // 'youtube', 'instagram', etc
    kind,         // 'hashtag', 'search_term', 'url_visit'
    label,
    url,
    creator,
    timestamp: timestamp || Date.now()
  };

  const queue = (await storage.get(QUEUE_KEY)) || [];
  queue.push(normalized);

  // Enforce max queue size (drop oldest)
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.splice(0, queue.length - MAX_QUEUE_SIZE);
  }

  await storage.set({ [QUEUE_KEY]: queue,
                       queueDirty: true
  });
}

export async function getBatch(batchSize = 20) {
  const queue = (await storage.get(QUEUE_KEY)) || [];
  return queue.slice(0, batchSize);
}

export async function removeBatch(count) {
  const queue = (await storage.get(QUEUE_KEY)) || [];
  queue.splice(0, count);
  await storage.set({ [QUEUE_KEY]: queue });
}

export async function queueSize() {
  const queue = (await storage.get(QUEUE_KEY)) || [];
  return queue.length;
}
