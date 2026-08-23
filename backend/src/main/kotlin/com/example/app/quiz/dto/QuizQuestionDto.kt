package com.example.app.quiz.dto

// GET /api/quiz/questions のレスポンス要素。
// correctIndex / explanation は意図的に含めない（docs/adr/0003 — 正解はクライアントに渡さない）。
data class QuizQuestionDto(
    val id: Long,
    val question: String,
    val choices: List<String>,
)
