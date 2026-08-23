package com.example.app.quiz

import com.example.app.quiz.dto.AnswerRequest
import com.example.app.quiz.dto.AnswerResultDto
import com.example.app.quiz.dto.QuizQuestionDto
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/quiz/questions")
class QuizController(
    private val quizService: QuizService,
) {
    @GetMapping
    fun getQuestions(
        @RequestParam(required = false, defaultValue = "5") count: Int,
    ): List<QuizQuestionDto> = quizService.getQuestions(count)

    @PostMapping("/{id}/answer")
    fun answer(
        @PathVariable id: Long,
        @Valid @RequestBody request: AnswerRequest,
    ): AnswerResultDto = quizService.judgeAnswer(id, request.selectedIndex)
}
