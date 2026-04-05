import { useEffect, useRef } from 'react';

/**
 * Hook for Server-Sent Events connection.
 * Automatically reconnects on failure.
 *
 * @param {string} url — SSE endpoint URL
 * @param {Object} handlers — { event_name: callbackFn }
 * @param {boolean} enabled
 */
export function useSSE(url, handlers, enabled = true) {
  const esRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    let retryTimeout;

    function connect() {
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => console.log('[SSE] Connected to', url);

      es.onerror = () => {
        es.close();
        // Reconnect after 3 seconds
        retryTimeout = setTimeout(connect, 3000);
      };

      // Register all event handlers
      for (const [event, fn] of Object.entries(handlers)) {
        es.addEventListener(event, (e) => {
          try {
            fn(JSON.parse(e.data));
          } catch (err) {
            console.error('[SSE] Parse error:', err);
          }
        });
      }
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      esRef.current?.close();
    };
  }, [url, enabled]);
}
