package com.example.app.quiz

import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

// V2__create_quiz_questions.sql に対応するEntity。
// correctIndex / explanation は正解値なので、DTOには絶対に流さない（docs/adr/0003）。
@Entity
@Table(name = "quiz_questions")
class QuizQuestion(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    val question: String = "",
    val choice1: String = "",
    val choice2: String = "",
    val choice3: String = "",
    val choice4: String = "",
    val correctIndex: Short = 0,
    val explanation: String = "",
)
