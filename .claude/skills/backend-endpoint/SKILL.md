---
name: backend-endpoint
description: Conventions and step-by-step recipe for adding a REST endpoint in the Spring Boot + Kotlin backend, including layering (controller/service/repository), DTO mapping, validation, and both JPA/Postgres and DynamoDB persistence patterns. Use when adding or modifying backend APIs.
---

# バックエンド エンドポイント追加

## レイヤ構成（package-by-feature）

機能 `foo` は `backend/src/main/kotlin/com/example/app/foo/` にまとめる：

```
foo/
├── FooController.kt   # @RestController — HTTP I/O と検証のみ
├── FooService.kt      # @Service — ビジネスロジック
├── FooRepository.kt   # 永続化（JpaRepository または Dynamo実装）
├── Foo.kt             # Entity / ドメインモデル
└── dto/
    ├── FooRequest.kt  # 入力DTO（@field:NotBlank 等で検証）
    └── FooResponse.kt # 出力DTO（Entityを直接返さない）
```

## 規約

1. **Controllerは薄く**: リクエスト受け取り→検証→Service呼び出し→DTO返却まで。ロジック禁止。
2. **入出力はDTO**。Entityをレスポンスに晒さない。変換関数（`toResponse()` 拡張関数など）を用意。
3. **検証はDTOで宣言的に**: `jakarta.validation` の `@field:NotBlank` `@field:Size` 等。Controllerで `@Valid`。
4. **例外は集約**: `@RestControllerAdvice` でハンドリングし、一貫したエラーレスポンス（`{ "message": ..., "code": ... }`）を返す。
5. **URLは複数形リソース**: `GET /api/foos`, `POST /api/foos`, `GET /api/foos/{id}`。
6. **テストが先**: Service単体（JUnit5 + MockK）、Controller層（`@WebMvcTest` or `MockMvc`）を
   **実装より先に書き、赤を見てから**実装する（`.claude/skills/tdd/SKILL.md`）。
   `make test` はDBを起動しないので `@SpringBootTest` / `@DataJpaTest` は使えない。

## Postgres（JPA + Flyway）の場合

- Entityは `@Entity`、`FooRepository : JpaRepository<Foo, Long>`。
- **スキーマ変更は必ずFlywayマイグレーション**で行う（`db-migration` スキル参照）。`ddl-auto` は `validate` 固定、自動生成に頼らない。

## DynamoDBの場合

- `config/DynamoDbConfig.kt` の `DynamoDbEnhancedClient` を注入。
- Entityは `@DynamoDbBean`、`@DynamoDbPartitionKey` / `@DynamoDbSortKey` を付与。
- Repositoryは `DynamoDbTable<Foo>` をラップした自前クラス（JpaRepositoryは使わない）。
- テーブルは起動時 or マイグレーションスクリプトで作成（`db-migration` スキル参照）。

## 手順（赤 → 緑 → リファクタ）

**実装から書き始めない。** テストリストの1件ごとに1〜4を回す。

1. **契約だけ先に置く** — `dto/` の Request/Response（検証アノテーション込み）と、
   Service / Controller の**シグネチャ**を作る。中身は `TODO("not implemented")`。
   ここまではコンパイルを通すためだけの作業で、ロジックは書かない。

2. **赤** — そのエンドポイント／メソッドのテストを1件書き、落ちるのを見る。

   ```bash
   cd backend && ./gradlew test --rerun-tasks --tests '*FooControllerTest*'
   ```

   落ちた理由が `NotImplementedError` か assertion であることを確認する。
   **コンパイルエラーは赤に数えない。** 緑になったらそのテストは実装を経由していない。
   確認できたらテストとスタブだけをコミットする（`test: <対象> — red (<テスト名>)`）。

3. **緑** — 赤を消す最小限を実装する。Service にロジック、Controller は `@Valid` と
   ステータスだけ。必要なら Entity / Repository、Postgresなら Flyway マイグレーションを追加。
   `./gradlew test --rerun-tasks` で緑を確認してコミットする。

4. **リファクタ** — 変換関数（`toResponse()`）の抽出、`@RestControllerAdvice` へのエラー型追加、
   層の整理。**テストは変えない**。緑を保ったまま上の「規約」に寄せる。

5. テストリストが尽きたら、フロント側の型・APIクライアント（`frontend/src/api`）を対応させる。
   渡すのは**実際のレスポンスJSON**（推測させない）。
