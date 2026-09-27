import { useCallback, useEffect, useState } from "react";

export interface AsyncList<T> {
  items: T[];
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/**
 * Shared loading/error/reload cycle for list-backed screens.
 * Pass a stable module-level fetcher (a service function), never an inline
 * arrow, so the effect only reruns when `reload()` is called.
 */
export function useAsyncList<T>(fetcher: () => Promise<T[]>): AsyncList<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestId, setRequestId] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    setRequestId((id) => id + 1);
  }, []);

  useEffect(() => {
    let active = true;

    fetcher()
      .then((result) => {
        if (!active) return;
        setItems(result);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestId, fetcher]);

  return { items, loading, error, reload };
}
