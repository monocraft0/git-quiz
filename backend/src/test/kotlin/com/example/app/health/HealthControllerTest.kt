package com.example.app.health

import com.example.app.health.dto.HealthResponse
import com.ninjasquad.springmockk.MockkBean
import io.mockk.every
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@WebMvcTest(HealthController::class)
class HealthControllerTest(
    @Autowired val mockMvc: MockMvc,
) {
    @MockkBean
    lateinit var healthService: HealthService

    @Test
    fun `GET api health returns status`() {
        every { healthService.check() } returns HealthResponse(status = "UP", service = "app")

        mockMvc.get("/api/health")
            .andExpect {
                status { isOk() }
                jsonPath("$.status") { value("UP") }
                jsonPath("$.service") { value("app") }
            }
    }
}
