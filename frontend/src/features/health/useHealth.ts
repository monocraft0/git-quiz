import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { HealthResponse } from './types';

// データ取得はフックに隔離し、loading / error / data の3状態を扱う。
export function useHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<HealthResponse>('/api/health')
      .then((res) => alive && setData(res))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'unknown error'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading, error };
}
