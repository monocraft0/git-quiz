import { useQuiz } from './useQuiz';

export function QuizPage() {
  const {
    loading,
    error,
    currentQuestion,
    result,
    score,
    answeredCount,
    total,
    finished,
    submitAnswer,
    nextQuestion,
  } = useQuiz();

  return (
    <section>
      <h2>gitクイズ</h2>
      {loading && <p role="status">読み込み中…</p>}
      {error && <p role="alert">error: {error}</p>}
      {!loading && !error && finished && (
        <p>
          {total}問中{score}問正解
        </p>
      )}
      {!loading && !error && !finished && currentQuestion && (
        <div>
          <p>{currentQuestion.question}</p>
          <ul>
            {currentQuestion.choices.map((choice, index) => (
              <li key={index}>
                <button type="button" disabled={!!result} onClick={() => submitAnswer(index)}>
                  {choice}
                </button>
              </li>
            ))}
          </ul>
          {result && (
            <div>
              <p>{result.correct ? '正解' : '不正解'}</p>
              <p>{result.explanation}</p>
              <p>
                現在のスコア: {score} / {answeredCount}
              </p>
              <button type="button" onClick={nextQuestion}>
                次の問題へ
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
