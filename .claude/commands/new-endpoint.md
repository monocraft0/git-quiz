---
description: バックエンドにRESTエンドポイントを追加する（引数に機能/リソース名）
argument-hint: <resource-name> [--db=postgres|dynamo]
---

`$ARGUMENTS` のリソースについて、`.claude/skills/backend-endpoint/SKILL.md` に従いエンドポイントを実装する。

`.claude/skills/tdd/SKILL.md` に従い、**テストから書く**。

1. 必要な操作（一覧/取得/作成/更新/削除のどれか）と永続化先を確認。
2. **テストリスト**を作る（正常系1本 → 境界 → 失敗系）。実装はまだ書かない。
3. dto と、service / controller の**シグネチャだけ**を package-by-feature で置く（中身は `TODO()`）。
4. **赤**: テストを1件書き、`cd backend && ./gradlew test --rerun-tasks --tests '*<クラス>*'` で
   落ちるのを見る（コンパイルエラーは赤に数えない）。テストとスタブだけをコミット
   （`test: <対象> — red (<テスト名>)`）。
5. **緑**: 最小限を実装してコミット。必要なら entity / repository、Postgresなら Flyway
   マイグレーションを追加（`db-migration` スキル参照、既存Vは編集しない）。
6. **リファクタ**: 層の分離・変換関数の抽出。テストは変えない。リストが尽きるまで4へ。
7. `cd backend && ./gradlew test --rerun-tasks` を通す。
8. フロント側で必要になる型・APIクライアントの変更点を、**実際のレスポンスJSON**つきで報告する。

分量が大きい場合は `backend-dev` エージェントへ委譲してよい。
