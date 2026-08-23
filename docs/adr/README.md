# ADR（設計判断の記録）

Architecture Decision Record。**なぜそう決めたか**だけを置く。

1判断1ファイル。**書き換えない**（覆すときは新しいADRを起票して旧ADRを `superseded` にする）。
`_template.md` が雛形。書式・採番・起票の基準は
[.claude/skills/adr/SKILL.md](../../.claude/skills/adr/SKILL.md) を参照。

新しいADRを作ったら、**下の索引に1行足す**。索引はここが唯一で、生成しない。

---

| id | title | status | 決定の要旨 |
| --- | --- | --- | --- |
| [0001](./0001-record-architecture-decisions.md) | 設計判断をADRとして記録する | accepted | 判断の履歴を `docs/adr/` にMADR風で残し、ループの成果物として `code-reviewer` が欠落を検出する |
| [0002](./0002-write-tests-first.md) | 実装より先にテストを書き、赤をコミットとして残す | accepted | TDDを設計原則にし、`test: … — red` コミットを証拠として `code-reviewer` が再現する。正しい赤があるテストはミューテーション試験を省く |
