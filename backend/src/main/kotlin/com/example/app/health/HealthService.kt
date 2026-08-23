package com.example.app.health

import com.example.app.health.dto.HealthResponse
import org.springframework.stereotype.Service

@Service
class HealthService {
    fun check(): HealthResponse = HealthResponse(status = "UP", service = "app")
}
