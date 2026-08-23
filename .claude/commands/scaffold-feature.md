---
description: フロント〜バックを縦断する機能を一括生成する（引数に機能名）
argument-hint: <feature-name> [--db=postgres|dynamo]
---

`$ARGUMENTS` で指定された機能を、バックエンドからフロントエンドまで縦断で実装する。

## 進め方

1. **設計を確認**: 機能名・扱うデータ・永続化先（`--db` 未指定なら Postgres を既定とし、ユーザーに確認）・必要なエンドポイントを短く整理して提示。
2. **テストリストを作る**: 何を確かめれば「できた」と言えるかを、実行できるテストの一覧にする
   （正常系1本 → 境界 → 失敗系）。**ここを飛ばして実装に入らない**。
   書き方は `.claude/skills/tdd/SKILL.md`「テストリストの作り方」。
3. **バックエンド**: `.claude/skills/backend-endpoint/SKILL.md`（必要なら `db-migration`）に従い、
   **赤 → 緑 → リファクタ**で1件ずつ実装。分量が大きければ `backend-dev` エージェントに委譲してよい。
   - dto / entity / repository / service / controller のシグネチャを先に置く（中身は `TODO()`）
   - テストを書いて赤を見る → テストだけコミット（`test: <対象> — red (<テスト名>)`）
   - 最小限の実装で緑 → コミット → リファクタ
   - Postgresなら Flyway マイグレーション
4. **型の受け渡し**: バックのDTOシグネチャと**実際のレスポンスJSON**を確定させる。
5. **フロントエンド**: `.claude/skills/frontend-feature/SKILL.md` に従い、同じく赤 → 緑 → リファクタ。
   分量が大きければ `frontend-dev` エージェントに委譲してよい。
   - `types.ts`（バックDTOに一致）を先に確定 → RTLのテストで赤 → フック / コンポーネント / ページ
6. **検証**: `make test`（または `./gradlew test --rerun-tasks` と `npm test`）と `npm run build` を通す。
7. **仕上げ**: `code-reviewer` エージェントで規約チェックを行い、指摘を反映。
   レビュアーは**赤コミットを再現する**ので、実装を先に書いた箇所があればそこで止まる。

最後に、追加ファイル・エンドポイント・画面・残タスクを要約して報告する。
