---
name: db-migration
description: How to evolve the database schema — Flyway versioned SQL migrations for PostgreSQL, and table creation/seeding for DynamoDB Local. Use whenever a schema change, new table, index, or seed data is needed.
---

# DBマイグレーション

## PostgreSQL — Flyway

マイグレーションは `backend/src/main/resources/db/migration/` に **バージョン付きSQL** で置く。
Spring Boot起動時にFlywayが未適用分を自動実行する。

### 命名規則

```
V<番号>__<説明>.sql        例: V2__add_users_table.sql
```

- 番号は連番・単調増加。既存ファイルは**絶対に編集しない**（適用済みSQLの変更はチェックサム不整合になる）。
- 説明は snake_case。
- ロールバックはFlyway Community無し前提 → 打ち消しは新しい `V` で行う。

### 手順

1. 既存の最大バージョンを確認（`ls db/migration/`）。
2. `V<次番号>__<説明>.sql` を新規作成。
3. `CREATE TABLE` / `ALTER TABLE` / `CREATE INDEX` を記述（冪等にしたい場合 `IF NOT EXISTS`）。
4. `./gradlew bootRun` で適用、または `./gradlew flywayMigrate`（プラグイン設定時）。
5. Entity（`@Entity`）とカラムを一致させる。`ddl-auto: validate` なので不一致は起動時に落ちる。

### サンプル

```sql
-- V2__add_users_table.sql
CREATE TABLE users (
    id         BIGSERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

## DynamoDB — テーブル作成

Flyway対象外。テーブルは以下いずれかで用意する：

- **推奨（ローカル）**: `infra/dynamodb/create-tables.sh`（AWS CLI）を用意し、`setup-local` で実行。
- アプリ起動時に `DynamoDbEnhancedClient` で `createTable()`（存在チェック付き）。

### AWS CLIでの作成例

```bash
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 --region ap-northeast-1 \
  --table-name Items \
  --attribute-definitions AttributeName=pk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 注意

- DynamoDBはスキーマレス。属性の増減にマイグレーションSQLは不要だが、**キー設計（PK/SK/GSI）は変更困難**なので初期設計を慎重に。
- ローカルのテーブル定義は必ずスクリプト化してリポジトリに残す（再現性のため）。
