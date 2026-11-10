package com.example.app.mission

import com.example.app.mission.dto.GoalResultDto
import com.example.app.mission.dto.JudgeResultDto
import com.example.app.mission.dto.MissionDto
import com.example.app.mission.dto.RepoSnapshotDto
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.springframework.stereotype.Service

@Service
class MissionService(
    private val repository: GitMissionRepository,
    private val objectMapper: ObjectMapper,
) {
    fun getMissions(): List<MissionDto> =
        repository.findAllByOrderBySortOrderAsc().map { it.toDto() }

    // コマンド列ではなく結果の状態で判定する（別解も正解になる。docs/adr/0004）
    fun judge(id: Long, snapshot: RepoSnapshotDto): JudgeResultDto {
        val mission = repository.findById(id)
            .orElseThrow { NoSuchElementException("mission not found: $id") }

        val results = goalsOf(mission).map { GoalResultDto(it.description, it.isSatisfiedBy(snapshot)) }
        return JudgeResultDto(
            cleared = results.all { it.passed },
            goals = results,
            explanation = mission.explanation,
            modelAnswer = lines(mission.modelAnswer),
        )
    }

    private fun GoalSpec.isSatisfiedBy(s: RepoSnapshotDto): Boolean {
        val commitsOf = s.branches.associate { it.name to it.commits }
        return when (type) {
            GoalType.HEAD_ON -> s.head == branch
            GoalType.BRANCH_EXISTS -> branch in commitsOf
            GoalType.STAGED -> file in s.staged
            GoalType.UNTRACKED -> file in s.untracked
            GoalType.CLEAN -> s.staged.isEmpty() && s.modified.isEmpty() && s.untracked.isEmpty()
            GoalType.COMMIT_COUNT -> commitsOf[branch]?.size == count
            GoalType.CONTAINS -> {
                val mine = commitsOf[branch] ?: return false
                val theirs = commitsOf[other] ?: return false
                mine.containsAll(theirs)
            }
        }
    }

    private fun goalsOf(mission: GitMission): List<GoalSpec> = objectMapper.readValue(mission.goals)

    private fun lines(text: String): List<String> = text.lines().map { it.trim() }.filter { it.isNotEmpty() }

    private fun GitMission.toDto() = MissionDto(
        id = id,
        title = title,
        description = description,
        setupCommands = lines(setupCommands),
        goals = goalsOf(this).map { it.description },
    )
}
