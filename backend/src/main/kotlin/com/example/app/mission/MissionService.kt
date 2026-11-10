package com.example.app.mission

import com.example.app.mission.dto.JudgeResultDto
import com.example.app.mission.dto.MissionDto
import com.example.app.mission.dto.RepoSnapshotDto
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service

@Service
class MissionService(
    private val repository: GitMissionRepository,
    private val objectMapper: ObjectMapper,
) {
    fun getMissions(): List<MissionDto> = TODO("not implemented")

    fun judge(id: Long, snapshot: RepoSnapshotDto): JudgeResultDto = TODO("not implemented")
}
