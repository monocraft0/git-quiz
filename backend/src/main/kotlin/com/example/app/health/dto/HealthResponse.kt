package com.example.app.health.dto

// フロントの HealthResponse (frontend/src/features/health/types.ts) に対応。
data class HealthResponse(
    val status: String,
    val service: String,
)
