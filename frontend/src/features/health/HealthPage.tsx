import { useHealth } from './useHealth';

export function HealthPage() {
  const { data, loading, error } = useHealth();

  return (
    <section>
      <h2>Backend Health</h2>
      {loading && <p role="status">checking…</p>}
      {error && <p role="alert">error: {error}</p>}
      {data && (
        <p>
          status: <strong>{data.status}</strong> (service: {data.service})
        </p>
      )}
    </section>
  );
}
