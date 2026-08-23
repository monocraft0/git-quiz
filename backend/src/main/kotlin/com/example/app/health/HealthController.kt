package com.example.app.health

import com.example.app.health.dto.HealthResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

// Controllerは薄く: I/OとServiceの呼び出しのみ。
@RestController
@RequestMapping("/api/health")
class HealthController(
    private val healthService: HealthService,
) {
    @GetMapping
    fun health(): HealthResponse = healthService.check()
}
