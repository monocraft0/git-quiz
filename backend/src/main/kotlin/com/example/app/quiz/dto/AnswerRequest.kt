package com.example.app.quiz.dto

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min

// POST /api/quiz/questions/{id}/answer のリクエストボディ。
// 選択肢は4択（choice1..4）なので0-3の範囲に限定する。
data class AnswerRequest(
    @field:Min(0)
    @field:Max(3)
    val selectedIndex: Int,
)
