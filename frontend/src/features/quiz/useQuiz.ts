import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { QuizQuestionDto, AnswerResultDto } from './types';

export interface QuizState {
  loading: boolean;
  error: string | null;
  currentQuestion: QuizQuestionDto | null;
  result: AnswerResultDto | null;
  score: number;
  answeredCount: number;
  total: number;
  finished: boolean;
  submitAnswer: (selectedIndex: number) => void;
  nextQuestion: () => void;
}

const QUESTION_COUNT = 5;

// データ取得・解答送信・スコア管理はフックに隔離し、loading / error / data の3状態を扱う。
export function useQuiz(): QuizState {
  const [questions, setQuestions] = useState<QuizQuestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<AnswerResultDto | null>(null);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<QuizQuestionDto[]>(`/api/quiz/questions?count=${QUESTION_COUNT}`)
      .then((res) => alive && setQuestions(res))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'unknown error'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const currentQuestion = questions[currentIndex] ?? null;

  const submitAnswer = (selectedIndex: number) => {
    if (!currentQuestion || result) return;
    api
      .post<AnswerResultDto>(`/api/quiz/questions/${currentQuestion.id}/answer`, { selectedIndex })
      .then((res) => {
        setResult(res);
        setAnsweredCount((c) => c + 1);
        if (res.correct) setScore((s) => s + 1);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'unknown error'));
  };

  const nextQuestion = () => {
    setResult(null);
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
  };

  return {
    loading,
    error,
    currentQuestion,
    result,
    score,
    answeredCount,
    total: questions.length,
    finished,
    submitAnswer,
    nextQuestion,
  };
}
