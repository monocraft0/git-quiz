package com.example.app.mission

import com.example.app.mission.dto.BranchSnapshotDto
import com.example.app.mission.dto.RepoSnapshotDto
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.Optional

class MissionServiceTest {
    private val repository = mockk<GitMissionRepository>()
    private val service = MissionService(repository, jacksonObjectMapper())

    private fun mission(goalsJson: String) = GitMission(
        id = 1,
        sortOrder = 1,
        title = "T",
        description = "D",
        setupCommands = "touch a.txt\ngit add a.txt",
        goals = goalsJson,
        modelAnswer = "git commit -m first",
        explanation = "because",
    )

    private fun snapshot(
        head: String? = "main",
        branches: Map<String, List<String>> = mapOf("main" to listOf("c1")),
        staged: List<String> = emptyList(),
        modified: List<String> = emptyList(),
        untracked: List<String> = emptyList(),
    ) = RepoSnapshotDto(
        head = head,
        branches = branches.map { (name, commits) -> BranchSnapshotDto(name, commits) },
        staged = staged,
        modified = modified,
        untracked = untracked,
    )

    private fun judgeOne(goalJson: String, snap: RepoSnapshotDto): Boolean {
        every { repository.findById(1L) } returns Optional.of(mission("[$goalJson]"))
        return service.judge(1L, snap).cleared
    }

    @Test
    fun `getMissions splits setup commands and exposes only goal descriptions`() {
        every { repository.findAllByOrderBySortOrderAsc() } returns listOf(
            mission("""[{"type":"COMMIT_COUNT","branch":"main","count":1,"description":"mainにコミットが1つ"}]"""),
        )

        val result = service.getMissions()

        assertEquals(1, result.size)
        assertEquals(1L, result[0].id)
        assertEquals("T", result[0].title)
        assertEquals(listOf("touch a.txt", "git add a.txt"), result[0].setupCommands)
        assertEquals(listOf("mainにコミットが1つ"), result[0].goals)
    }

    @Test
    fun `HEAD_ON passes only when head is the branch`() {
        val goal = """{"type":"HEAD_ON","branch":"feature","description":"d"}"""
        assertTrue(judgeOne(goal, snapshot(head = "feature")))
        assertFalse(judgeOne(goal, snapshot(head = "main")))
        assertFalse(judgeOne(goal, snapshot(head = null)))
    }

    @Test
    fun `BRANCH_EXISTS passes only when the branch is in the snapshot`() {
        val goal = """{"type":"BRANCH_EXISTS","branch":"feature","description":"d"}"""
        assertTrue(judgeOne(goal, snapshot(branches = mapOf("main" to listOf("c1"), "feature" to listOf("c1")))))
        assertFalse(judgeOne(goal, snapshot()))
    }

    @Test
    fun `STAGED and UNTRACKED check the file lists`() {
        val staged = """{"type":"STAGED","file":"a.txt","description":"d"}"""
        val untracked = """{"type":"UNTRACKED","file":"a.txt","description":"d"}"""
        assertTrue(judgeOne(staged, snapshot(staged = listOf("a.txt"))))
        assertFalse(judgeOne(staged, snapshot(untracked = listOf("a.txt"))))
        assertTrue(judgeOne(untracked, snapshot(untracked = listOf("a.txt"))))
        assertFalse(judgeOne(untracked, snapshot(staged = listOf("a.txt"))))
    }

    @Test
    fun `CLEAN fails when anything is staged, modified or untracked`() {
        val goal = """{"type":"CLEAN","description":"d"}"""
        assertTrue(judgeOne(goal, snapshot()))
        assertFalse(judgeOne(goal, snapshot(staged = listOf("a"))))
        assertFalse(judgeOne(goal, snapshot(modified = listOf("a"))))
        assertFalse(judgeOne(goal, snapshot(untracked = listOf("a"))))
    }

    @Test
    fun `COMMIT_COUNT compares the number of reachable commits`() {
        val goal = """{"type":"COMMIT_COUNT","branch":"main","count":2,"description":"d"}"""
        assertTrue(judgeOne(goal, snapshot(branches = mapOf("main" to listOf("c2", "c1")))))
        assertFalse(judgeOne(goal, snapshot(branches = mapOf("main" to listOf("c1")))))
        assertFalse(judgeOne(goal, snapshot(branches = emptyMap())))
    }

    @Test
    fun `CONTAINS passes when branch has every commit of other`() {
        val goal = """{"type":"CONTAINS","branch":"main","other":"feature","description":"d"}"""
        assertTrue(
            judgeOne(goal, snapshot(branches = mapOf("main" to listOf("m", "f1", "c1"), "feature" to listOf("f1", "c1")))),
        )
        assertFalse(
            judgeOne(goal, snapshot(branches = mapOf("main" to listOf("c1"), "feature" to listOf("f1", "c1")))),
        )
        assertFalse(judgeOne(goal, snapshot(branches = mapOf("main" to listOf("c1")))))
    }

    @Test
    fun `judge reports each goal and clears only when all pass, with explanation and model answer`() {
        every { repository.findById(1L) } returns Optional.of(
            mission(
                """[{"type":"HEAD_ON","branch":"main","description":"mainにいる"},
                    {"type":"CLEAN","description":"クリーン"}]""",
            ),
        )

        val result = service.judge(1L, snapshot(staged = listOf("a.txt")))

        assertFalse(result.cleared)
        assertEquals(listOf("mainにいる", "クリーン"), result.goals.map { it.description })
        assertEquals(listOf(true, false), result.goals.map { it.passed })
        assertEquals("because", result.explanation)
        assertEquals(listOf("git commit -m first"), result.modelAnswer)
    }

    @Test
    fun `judge throws NoSuchElementException when id is unknown`() {
        every { repository.findById(999L) } returns Optional.empty()

        assertThrows(NoSuchElementException::class.java) {
            service.judge(999L, snapshot())
        }
    }
}
