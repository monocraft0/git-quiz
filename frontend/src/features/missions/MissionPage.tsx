import { useEffect, useState } from 'react';
import { AreasPanel } from '../gitsim/AreasPanel';
import { GitGraph } from '../gitsim/GitGraph';
import { Terminal } from '../gitsim/Terminal';
import '../gitsim/gitsim.css';
import { useMissions } from './useMissions';

export function MissionPage() {
  const {
    loading,
    error,
    mission,
    missionIndex,
    total,
    repo,
    history,
    result,
    clearedCount,
    finished,
    run,
    judge,
    reset,
    next,
  } = useMissions();
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => setShowAnswer(false), [mission?.id, result]);

  if (loading) return <p role="status">読み込み中…</p>;
  if (error) return <p role="alert">error: {error}</p>;
  if (finished) {
    return (
      <section className="mission-summary">
        <h2>おつかれさま！</h2>
        <p className="summary-score">
          {total}問中{clearedCount}問クリア
        </p>
        <button type="button" onClick={() => window.location.reload()}>
          最初から挑戦する
        </button>
      </section>
    );
  }
  if (!mission) return <p>ミッションがありません</p>;

  const goalResult = (i: number) => result?.goals[i];

  return (
    <section className="mission">
      <header className="mission-header">
        <span className="mission-step">
          ミッション {missionIndex + 1} / {total}
        </span>
        <h2>{mission.title}</h2>
        <p className="mission-desc">{mission.description}</p>
        <ul className="mission-goals">
          {mission.goals.map((goal, i) => {
            const r = goalResult(i);
            const mark = !r ? '○' : r.passed ? '✓' : '✗';
            const state = !r ? 'pending' : r.passed ? 'passed' : 'failed';
            return (
              <li
                key={goal}
                className={`goal goal-${state}`}
                aria-label={r ? `${r.passed ? '達成' : '未達成'}: ${goal}` : undefined}
              >
                <span className="goal-mark" aria-hidden="true">
                  {mark}
                </span>
                {goal}
              </li>
            );
          })}
        </ul>
      </header>

      <div className="visual">
        <AreasPanel repo={repo} />
        <GitGraph repo={repo} />
      </div>

      <Terminal lines={history} onRun={run} />

      <div className="mission-actions">
        <button type="button" className="btn-primary" onClick={judge}>
          答え合わせ
        </button>
        <button type="button" onClick={reset}>
          リセット
        </button>
      </div>

      {result && (
        <div className={`mission-result ${result.cleared ? 'is-cleared' : 'is-failed'}`}>
          <p className="result-title">{result.cleared ? 'クリア！' : 'まだクリアしていません'}</p>
          {(result.cleared || showAnswer) && (
            <>
              <p>{result.explanation}</p>
              <p className="answer-label">模範解答の一例:</p>
              <pre className="answer">
                {result.modelAnswer.map((line) => (
                  <code key={line}>{line}</code>
                ))}
              </pre>
            </>
          )}
          {!result.cleared && !showAnswer && (
            <button type="button" onClick={() => setShowAnswer(true)}>
              答えを見る
            </button>
          )}
          <button type="button" className="btn-primary" onClick={next}>
            次のミッションへ
          </button>
        </div>
      )}
    </section>
  );
}
