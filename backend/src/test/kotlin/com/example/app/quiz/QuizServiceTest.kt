package com.example.app.quiz

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.Optional

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

    @Test
    fun `judgeAnswer returns correct true when selectedIndex matches correctIndex`() {
        every { repository.findById(1L) } returns Optional.of(
            QuizQuestion(
                id = 1,
                question = "Q1",
                choice1 = "a",
                choice2 = "b",
                choice3 = "c",
                choice4 = "d",
                correctIndex = 2,
                explanation = "because",
            ),
        )

        val result = service.judgeAnswer(1L, 2)

        assertTrue(result.correct)
        assertEquals(2, result.correctIndex)
        assertEquals("because", result.explanation)
    }

    @Test
    fun `judgeAnswer returns correct false when selectedIndex does not match correctIndex`() {
        every { repository.findById(1L) } returns Optional.of(
            QuizQuestion(
                id = 1,
                question = "Q1",
                choice1 = "a",
                choice2 = "b",
                choice3 = "c",
                choice4 = "d",
                correctIndex = 2,
                explanation = "because",
            ),
        )

        val result = service.judgeAnswer(1L, 0)

        assertFalse(result.correct)
        assertEquals(2, result.correctIndex)
    }

    @Test
    fun `judgeAnswer throws NoSuchElementException when id is unknown`() {
        every { repository.findById(999L) } returns Optional.empty()

        assertThrows(NoSuchElementException::class.java) {
            service.judgeAnswer(999L, 0)
        }
    }
}
