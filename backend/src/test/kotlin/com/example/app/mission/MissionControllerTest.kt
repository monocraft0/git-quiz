package com.example.app.mission

import com.example.app.mission.dto.GoalResultDto
import com.example.app.mission.dto.JudgeResultDto
import com.example.app.mission.dto.MissionDto
import com.ninjasquad.springmockk.MockkBean
import io.mockk.every
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post

@WebMvcTest(MissionController::class)
class MissionControllerTest(
    @Autowired val mockMvc: MockMvc,
) {
    @MockkBean
    lateinit var missionService: MissionService

    private val body = """
        {"head":"main","branches":[{"name":"main","commits":["c1"]}],
         "staged":[],"modified":[],"untracked":[]}
    """.trimIndent()

    @Test
    fun `GET api missions returns missions without answers`() {
        every { missionService.getMissions() } returns listOf(
            MissionDto(1, "最初のコミット", "説明", listOf("touch a.txt"), listOf("mainにコミットが1つ")),
        )

        mockMvc.get("/api/missions").andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(1) }
            jsonPath("$[0].id") { value(1) }
            jsonPath("$[0].title") { value("最初のコミット") }
            jsonPath("$[0].setupCommands[0]") { value("touch a.txt") }
            jsonPath("$[0].goals[0]") { value("mainにコミットが1つ") }
            jsonPath("$[0].modelAnswer") { doesNotExist() }
            jsonPath("$[0].explanation") { doesNotExist() }
        }
    }

    @Test
    fun `POST api missions id judge passes the snapshot to the service`() {
        every { missionService.judge(1, any()) } returns JudgeResultDto(
            cleared = true,
            goals = listOf(GoalResultDto("mainにいる", true)),
            explanation = "解説",
            modelAnswer = listOf("git commit -m first"),
        )

        mockMvc.post("/api/missions/1/judge") {
            contentType = MediaType.APPLICATION_JSON
            content = body
        }.andExpect {
            status { isOk() }
            jsonPath("$.cleared") { value(true) }
            jsonPath("$.goals[0].passed") { value(true) }
            jsonPath("$.explanation") { value("解説") }
            jsonPath("$.modelAnswer[0]") { value("git commit -m first") }
        }

        verify(exactly = 1) {
            missionService.judge(1, match { it.head == "main" && it.branches.single().commits == listOf("c1") })
        }
    }

    @Test
    fun `POST api missions id judge with unknown id returns 404`() {
        every { missionService.judge(999, any()) } throws NoSuchElementException("mission not found: 999")

        mockMvc.post("/api/missions/999/judge") {
            contentType = MediaType.APPLICATION_JSON
            content = body
        }.andExpect {
            status { isNotFound() }
            jsonPath("$.code") { value("NOT_FOUND") }
        }
    }

    @Test
    fun `POST api missions id judge with blank branch name returns 400`() {
        mockMvc.post("/api/missions/1/judge") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"head":"main","branches":[{"name":"","commits":[]}],"staged":[],"modified":[],"untracked":[]}"""
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("VALIDATION_ERROR") }
        }
    }
}
