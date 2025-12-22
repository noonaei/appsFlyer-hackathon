import { enqueueSignal } from './eventQueue.js';

export function maybeEmitSearchSignal(url) {
  try {
    const u = new URL(url);

    // Google Search
    if (
      u.hostname.includes('google.') &&
      u.pathname === '/search'
    ) {
      const query = u.searchParams.get('q');
      if (!query) return;

      enqueueSignal({
        type: 'search_intent',
        timestamp: Date.now(),
        engine: 'google',
        query,
        domain: u.hostname,
        platform: navigator.platform
      });
    }
  } catch {
    // ignore malformed URLs
  }
}
