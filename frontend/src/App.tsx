import { HealthPage } from './features/health/HealthPage';
import { QuizPage } from './features/quiz/QuizPage';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1>gitクイズ</h1>
      <p>React + Vite + TypeScript / Spring Boot + Kotlin / Postgres + DynamoDB</p>
      <HealthPage />
      <QuizPage />
    </main>
  );
}
