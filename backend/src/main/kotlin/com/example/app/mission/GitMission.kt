package com.example.app.mission

import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

// V3__create_git_missions.sql に対応するEntity。
// goals（判定条件JSON）/ modelAnswer / explanation は判定前のDTOに流さない（docs/adr/0004）。
@Entity
@Table(name = "git_missions")
class GitMission(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    val sortOrder: Int = 0,
    val title: String = "",
    val description: String = "",
    // 初期状態を作るコマンド。1行1コマンド
    val setupCommands: String = "",
    // 判定条件。GoalSpec の JSON 配列
    val goals: String = "[]",
    // 模範解答。1行1コマンド
    val modelAnswer: String = "",
    val explanation: String = "",
)
