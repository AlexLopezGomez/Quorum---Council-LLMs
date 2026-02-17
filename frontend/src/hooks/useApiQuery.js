import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic hook for data-fetching with loading / error / refetch support.
 * Automatically cancels in-flight requests on unmount or dependency change.
 *
 * @param {(signal: AbortSignal) => Promise<T>} fetchFn — async function that returns data
 * @param {any[]} deps — dependency array (refetches when these change)
 * @param {object} options
 * @param {boolean} options.enabled — set to false to skip the fetch (default true)
 * @returns {{ data: T|null, loading: boolean, error: Error|null, refetch: () => void }}
 */
export function useApiQuery(fetchFn, deps = [], { enabled = true } = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const fetchFnRef = useRef(fetchFn);
    fetchFnRef.current = fetchFn;

    const execute = useCallback(() => {
        if (!enabled) return;

        const controller = new AbortController();
        setLoading(true);
        setError(null);

        fetchFnRef
            .current(controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) {
                    setData(result);
                }
            })
            .catch((err) => {
                if (!controller.signal.aborted) {
                    setError(err);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, ...deps]);

    useEffect(() => {
        const cleanup = execute();
        return cleanup;
    }, [execute]);

    const refetch = useCallback(() => {
        execute();
    }, [execute]);

    return { data, loading, error, refetch };
}
