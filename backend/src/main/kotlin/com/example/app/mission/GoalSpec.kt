package com.example.app.mission

// git_missions.goals に保存する判定条件の1件。
// コミットIDは初期化コマンドに依存して変わるので、条件には使わない（docs/adr/0004）。
enum class GoalType {
    HEAD_ON, // branch にいる
    BRANCH_EXISTS, // branch が存在する
    STAGED, // file がステージにある
    UNTRACKED, // file が未追跡
    CLEAN, // ステージ・変更・未追跡がすべて空
    COMMIT_COUNT, // branch から到達できるコミットが count 件
    CONTAINS, // branch が other の全コミットを含む（マージ済み）
}

data class GoalSpec(
    val type: GoalType,
    val description: String,
    val branch: String? = null,
    val other: String? = null,
    val file: String? = null,
    val count: Int? = null,
)
