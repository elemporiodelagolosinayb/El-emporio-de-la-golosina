import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

/**
 * GET con estado de carga y recarga manual.
 * const { data, loading, reload, setData } = useApi('/admin/products', { page: 1 })
 */
export function useApi(url, params = {}, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const key = JSON.stringify(params);
  const reqId = useRef(0);

  const reload = useCallback(async () => {
    if (!url) return;
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      if (id === reqId.current) {
        setData(res.data);
        setError(null);
      }
    } catch (err) {
      if (id === reqId.current) setError(err);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [url, key]);

  useEffect(() => {
    if (enabled) reload();
  }, [reload, enabled]);

  return { data, loading, error, reload, setData };
}
