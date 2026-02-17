import { useState, useEffect, useCallback, useRef } from 'react';
import { SSE_EVENT_TYPES, SSE_TERMINAL_EVENTS } from '../lib/constants';
import { safeJsonParse } from '../lib/utils';

/**
 * Hook for consuming Server-Sent Events from an evaluation stream.
 *
 * @param {string|null} url — SSE endpoint URL (null = disconnected)
 * @returns {{ events: Array, status: string, error: string|null, reset: () => void }}
 */
export function useSSE(url) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  const connect = useCallback(() => {
    if (!url) return undefined;

    setStatus('connecting');
    setError(null);

    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus('connected');
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setStatus('error');
      setError('Connection lost');
      eventSource.close();
    };

    SSE_EVENT_TYPES.forEach((type) => {
      eventSource.addEventListener(type, (e) => {
        const data = safeJsonParse(e.data);
        if (!data) return; // skip malformed events

        setEvents((prev) => [...prev, { type, data, timestamp: Date.now() }]);

        if (SSE_TERMINAL_EVENTS.has(type)) {
          setStatus('complete');
          eventSource.close();
        }
      });
    });

    return () => {
      eventSource.close();
    };
  }, [url]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connect]);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setEvents([]);
    setStatus('disconnected');
    setError(null);
  }, []);

  return { events, status, error, reset };
}
