import { storage } from './storage.js';

const QUEUE_KEY = 'eventQueue';
const MAX_QUEUE_SIZE = 100;

export async function enqueueSignal(signal) {
  const queue = (await storage.get(QUEUE_KEY)) || [];

  queue.push(signal);

  // Enforce max size (drop oldest)
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.splice(0, queue.length - MAX_QUEUE_SIZE);
  }

  await storage.set({ [QUEUE_KEY]: queue });
}

export async function getBatch(batchSize) {
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
