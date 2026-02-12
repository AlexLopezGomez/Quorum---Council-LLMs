import { useState, useEffect, useCallback, useRef } from 'react';

export function useSSE(url) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  const connect = useCallback(() => {
    if (!url) return;

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

    const eventTypes = [
      'connected',
      'evaluation_start',
      'test_case_start',
      'judge_start',
      'judge_complete',
      'judge_error',
      'aggregator_start',
      'aggregator_complete',
      'aggregator_error',
      'test_case_complete',
      'evaluation_complete',
      'evaluation_error',
      'replay_complete',
      'risk_scored',
      'strategy_selected',
      'deterministic_start',
      'deterministic_complete',
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (e) => {
        const data = JSON.parse(e.data);
        setEvents((prev) => [...prev, { type, data, timestamp: Date.now() }]);

        if (type === 'evaluation_complete' || type === 'evaluation_error' || type === 'replay_complete') {
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
    return cleanup;
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
