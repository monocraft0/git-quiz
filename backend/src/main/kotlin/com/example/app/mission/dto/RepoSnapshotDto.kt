package com.example.app.mission.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank

// POST /api/missions/{id}/judge のリクエストボディ。
// フロントのシミュレータが作ったリポジトリ状態（frontend/src/features/missions/types.ts と一致させる）。
data class RepoSnapshotDto(
    // いまいるブランチ名。detached HEAD のときは null
    val head: String?,
    @field:Valid
    val branches: List<BranchSnapshotDto>,
    val staged: List<String>,
    val modified: List<String>,
    val untracked: List<String>,
)

data class BranchSnapshotDto(
    @field:NotBlank
    val name: String,
    // このブランチの先端から到達できるコミットID
    val commits: List<String>,
)
