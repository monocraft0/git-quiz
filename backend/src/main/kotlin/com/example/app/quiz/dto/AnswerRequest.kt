package com.example.app.quiz.dto

// POST /api/quiz/questions/{id}/answer のリクエストボディ。
data class AnswerRequest(
    val selectedIndex: Int,
)
