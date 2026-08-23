---
description: Flywayマイグレーション(またはDynamoDBテーブル)を追加する（引数に説明）
argument-hint: <description> [--dynamo]
---

`$ARGUMENTS` のスキーマ変更を、`.claude/skills/db-migration/SKILL.md` に従い追加する。

## Postgres（既定）

1. `backend/src/main/resources/db/migration/` の既存最大バージョンを確認。
2. `V<次番号>__<snake_case説明>.sql` を新規作成（**既存Vは絶対に編集しない**）。
3. DDLを記述。対応するEntityとカラムを一致させる。
4. `cd backend && ./gradlew bootRun` などで適用し、起動時 `validate` が通ることを確認。

## DynamoDB（`--dynamo` 指定時）

1. `infra/dynamodb/create-tables.sh` にテーブル定義（キー設計）を追記。
2. `setup-local` で再作成できることを確認。
3. キー設計（PK/SK/GSI）は後から変えにくい点に注意して提案する。
