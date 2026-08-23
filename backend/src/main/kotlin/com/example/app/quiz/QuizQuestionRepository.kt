package com.example.app.quiz

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface QuizQuestionRepository : JpaRepository<QuizQuestion, Long> {
    @Query(value = "SELECT * FROM quiz_questions ORDER BY random() LIMIT :count", nativeQuery = true)
    fun findRandomQuestions(@Param("count") count: Int): List<QuizQuestion>
}
