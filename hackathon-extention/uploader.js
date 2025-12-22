import { getBatch, removeBatch } from './eventQueue.js';

const BATCH_SIZE = 50;

export async function flushQueue() {
  const batch = await getBatch(BATCH_SIZE);
  if (batch.length === 0) return;

  try {
    const res = await fetch('https://your-api.example/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch })
    });

    if (!res.ok) throw new Error('Upload failed');

    await removeBatch(batch.length);
    console.log('Uploaded batch:', batch.length);
  } catch (err) {
    console.warn('Upload deferred:', err.message);
  }
}
