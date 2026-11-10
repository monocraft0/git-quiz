package com.example.app.mission.dto

// GET /api/missions のレスポンス要素。
// goals は説明文だけ。判定条件・模範解答・解説は含めない（docs/adr/0004）。
data class MissionDto(
    val id: Long,
    val title: String,
    val description: String,
    val setupCommands: List<String>,
    val goals: List<String>,
)
