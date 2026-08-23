package com.example.app.quiz

import com.example.app.quiz.dto.AnswerResultDto
import com.example.app.quiz.dto.QuizQuestionDto
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

@WebMvcTest(QuizController::class)
class QuizControllerTest(
    @Autowired val mockMvc: MockMvc,
) {
    @MockkBean
    lateinit var quizService: QuizService

    @Test
    fun `GET api quiz questions with count returns questions without correct answer`() {
        every { quizService.getQuestions(2) } returns listOf(
            QuizQuestionDto(id = 1, question = "Q1", choices = listOf("a", "b", "c", "d")),
            QuizQuestionDto(id = 2, question = "Q2", choices = listOf("w", "x", "y", "z")),
        )

        mockMvc.get("/api/quiz/questions?count=2")
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(2) }
                jsonPath("$[0].id") { value(1) }
                jsonPath("$[0].question") { value("Q1") }
                jsonPath("$[0].choices.length()") { value(4) }
                jsonPath("$[0].correctIndex") { doesNotExist() }
                jsonPath("$[0].explanation") { doesNotExist() }
            }
    }

    @Test
    fun `GET api quiz questions without count uses default count 5`() {
        every { quizService.getQuestions(5) } returns emptyList()

        mockMvc.get("/api/quiz/questions")
            .andExpect {
                status { isOk() }
            }

        verify(exactly = 1) { quizService.getQuestions(5) }
    }

    @Test
    fun `POST api quiz questions id answer with correct index returns correct true`() {
        every { quizService.judgeAnswer(1, 0) } returns AnswerResultDto(
            correct = true,
            correctIndex = 0,
            explanation = "git add はステージングに追加します。",
        )

        mockMvc.post("/api/quiz/questions/1/answer") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"selectedIndex":0}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.correct") { value(true) }
            jsonPath("$.correctIndex") { value(0) }
            jsonPath("$.explanation") { value("git add はステージングに追加します。") }
        }
    }

    @Test
    fun `POST api quiz questions id answer with wrong index returns correct false`() {
        every { quizService.judgeAnswer(1, 3) } returns AnswerResultDto(
            correct = false,
            correctIndex = 0,
            explanation = "git add はステージングに追加します。",
        )

        mockMvc.post("/api/quiz/questions/1/answer") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"selectedIndex":3}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.correct") { value(false) }
        }
    }
}
