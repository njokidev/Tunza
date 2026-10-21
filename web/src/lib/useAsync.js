import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api/client';

/** Run an async loader on mount (and when deps change); expose data/loading/error/reload. */
export function useAsync(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      setData(await run());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => { reload(); }, [reload]);

  return { data, setData, loading, error, reload };
}
