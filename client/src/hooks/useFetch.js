import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg, isCancel } from '../api/client';

// Runs `fetcher(signal)` whenever `deps` change. Cancels stale requests so fast
// filter changes can't show out-of-order results.
export default function useFetch(fetcher, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError('');
    fetcherRef
      .current(ctrl.signal)
      .then((d) => {
        if (!ctrl.signal.aborted) setData(d);
      })
      .catch((err) => {
        if (!isCancel(err) && !ctrl.signal.aborted) setError(errMsg(err));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload, setData };
}
