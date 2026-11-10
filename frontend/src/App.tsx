import { MissionPage } from './features/missions/MissionPage';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '1.5rem 1rem', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.2rem' }}>gitクイズ</h1>
      <p style={{ marginTop: 0, color: 'var(--muted)' }}>
        コマンドを打って、ミッションの状態を作ろう。打ったコマンドの結果は下の図ですぐに動きます。
      </p>
      <MissionPage />
    </main>
  );
}
