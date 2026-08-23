// backend の com.example.app.quiz の DTO に対応させる。

// GET /api/quiz/questions?count=N のレスポンス要素
// correctIndex / explanation は判定前のクライアントに渡さない設計（docs/adr/0003 参照）。
export interface QuizQuestionDto {
  id: number;
  question: string;
  choices: string[];
}

// POST /api/quiz/questions/{id}/answer のリクエストボディ
export interface AnswerRequest {
  selectedIndex: number;
}

// POST /api/quiz/questions/{id}/answer のレスポンス
export interface AnswerResultDto {
  correct: boolean;
  correctIndex: number;
  explanation: string;
}
