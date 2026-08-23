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

// データ取得・解答送信・スコア管理はフックに隔離し、loading / error / data の3状態を扱う。
export function useQuiz(): QuizState {
  throw new Error('not implemented');
}
