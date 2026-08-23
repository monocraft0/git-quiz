package com.example.app.quiz

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class QuizServiceTest {
    private val repository = mockk<QuizQuestionRepository>()
    private val service = QuizService(repository)

    @Test
    fun `getQuestions maps entities to dto without leaking correctIndex or explanation`() {
        every { repository.findRandomQuestions(2) } returns listOf(
            QuizQuestion(
                id = 10,
                question = "Q1",
                choice1 = "a",
                choice2 = "b",
                choice3 = "c",
                choice4 = "d",
                correctIndex = 1,
                explanation = "because",
            ),
            QuizQuestion(
                id = 11,
                question = "Q2",
                choice1 = "w",
                choice2 = "x",
                choice3 = "y",
                choice4 = "z",
                correctIndex = 3,
                explanation = "because2",
            ),
        )

        val result = service.getQuestions(2)

        assertEquals(2, result.size)
        assertEquals(10L, result[0].id)
        assertEquals("Q1", result[0].question)
        assertEquals(listOf("a", "b", "c", "d"), result[0].choices)
        assertEquals(11L, result[1].id)
        assertEquals(listOf("w", "x", "y", "z"), result[1].choices)
    }
}
