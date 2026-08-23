import { HealthPage } from './features/health/HealthPage';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1>App Template</h1>
      <p>React + Vite + TypeScript / Spring Boot + Kotlin / Postgres + DynamoDB</p>
      <HealthPage />
    </main>
  );
}
