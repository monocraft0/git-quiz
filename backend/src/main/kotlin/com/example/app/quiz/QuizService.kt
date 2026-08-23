package com.example.app.quiz

import com.example.app.quiz.dto.AnswerResultDto
import com.example.app.quiz.dto.QuizQuestionDto
import org.springframework.stereotype.Service

@Service
class QuizService(
    private val quizQuestionRepository: QuizQuestionRepository,
) {
    fun getQuestions(count: Int): List<QuizQuestionDto> =
        quizQuestionRepository.findRandomQuestions(count).map { it.toDto() }

    fun judgeAnswer(id: Long, selectedIndex: Int): AnswerResultDto {
        val question = quizQuestionRepository.findById(id)
            .orElseThrow { NoSuchElementException("quiz question not found: $id") }

        return AnswerResultDto(
            correct = selectedIndex == question.correctIndex.toInt(),
            correctIndex = question.correctIndex.toInt(),
            explanation = question.explanation,
        )
    }

    private fun QuizQuestion.toDto() = QuizQuestionDto(
        id = id,
        question = question,
        choices = listOf(choice1, choice2, choice3, choice4),
    )
}
