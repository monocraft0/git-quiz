package com.example.app.quiz.dto

// POST /api/quiz/questions/{id}/answer のレスポンス。判定はサーバー側で行う（docs/adr/0003）。
data class AnswerResultDto(
    val correct: Boolean,
    val correctIndex: Int,
    val explanation: String,
)
