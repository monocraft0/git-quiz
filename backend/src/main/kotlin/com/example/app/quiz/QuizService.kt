package com.example.app.quiz

import com.example.app.quiz.dto.AnswerResultDto
import com.example.app.quiz.dto.QuizQuestionDto
import org.springframework.stereotype.Service

@Service
class QuizService(
    private val quizQuestionRepository: QuizQuestionRepository,
) {
    fun getQuestions(count: Int): List<QuizQuestionDto> = TODO("not implemented")

    fun judgeAnswer(id: Long, selectedIndex: Int): AnswerResultDto = TODO("not implemented")
}
