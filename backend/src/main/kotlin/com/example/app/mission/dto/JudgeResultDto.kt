package com.example.app.mission.dto

// POST /api/missions/{id}/judge のレスポンス。
data class JudgeResultDto(
    val cleared: Boolean,
    val goals: List<GoalResultDto>,
    val explanation: String,
    val modelAnswer: List<String>,
)

data class GoalResultDto(
    val description: String,
    val passed: Boolean,
)
