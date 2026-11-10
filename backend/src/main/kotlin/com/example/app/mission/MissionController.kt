package com.example.app.mission

import com.example.app.mission.dto.JudgeResultDto
import com.example.app.mission.dto.MissionDto
import com.example.app.mission.dto.RepoSnapshotDto
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/missions")
class MissionController(
    private val missionService: MissionService,
) {
    @GetMapping
    fun getMissions(): List<MissionDto> = missionService.getMissions()

    @PostMapping("/{id}/judge")
    fun judge(
        @PathVariable id: Long,
        @Valid @RequestBody snapshot: RepoSnapshotDto,
    ): JudgeResultDto = missionService.judge(id, snapshot)
}
