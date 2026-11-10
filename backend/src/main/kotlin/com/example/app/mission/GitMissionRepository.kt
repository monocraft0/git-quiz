package com.example.app.mission

import org.springframework.data.jpa.repository.JpaRepository

interface GitMissionRepository : JpaRepository<GitMission, Long> {
    fun findAllByOrderBySortOrderAsc(): List<GitMission>
}
