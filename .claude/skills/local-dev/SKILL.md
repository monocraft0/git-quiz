---
name: local-dev
description: Local backing services (PostgreSQL, DynamoDB Local) for this monorepo — how they are shared across apps, how to inspect them, and how to recover when a container or connection fails. Use when a DB connection fails, when data needs inspecting or resetting, or when diagnosing container/port problems. For simply starting the app, use the Makefile (`make start`).
---

# ローカル開発基盤

`infra/docker-compose.yml` が Postgres / DynamoDB Local / dynamodb-admin を起動する。

**通常の起動は `make start` を使う**（DB起動・アプリ用DB作成・疎通待ちまで面倒を見る）。
このスキルは、その裏側の構造と、壊れたときの直し方を扱う。規約は `.claude/skills/make-tasks/SKILL.md`。

| サービス | ポート | 用途 |
| --- | --- | --- |
| postgres | 5432 | RDB。user/pass/db は `.env` 参照 |
| dynamodb-local | 8000 | DynamoDB互換エンドポイント |
| dynamodb-admin | 8001 | DynamoDBのGUI (http://localhost:8001) |

## 重要: コンテナは共有、データベースはアプリごと

このテンプレートから作られたアプリは、**同じ `app-postgres` コンテナとボリュームを共有する**。
分離されているのは**データベース単位**で、アプリ名（ディレクトリ名）が既定のDB名になる。

```
app-postgres (コンテナ1つ / ボリューム1つ)
├── myapp     ← myapp アプリ
├── todo_app   ← todo-app アプリ
└── ...
```

このため次が守られていないと、**他アプリを壊す**：

- `.env` の `POSTGRES_DB` をアプリ固有にする。共有すると別アプリのFlyway履歴と衝突し
  `Migration checksum mismatch` で起動できなくなる。
- **`docker compose down -v` を使わない。** `-v` は共有ボリュームごと消すので、
  全アプリのデータが飛ぶ。初期化したいときは自分のDBだけを対象にする（下記）。
- コンテナを止めるのは影響範囲を確認してから（`make db-down`）。

## 状態確認

```bash
make status                                              # 3プロセスの起動状態
docker compose -f infra/docker-compose.yml ps            # コンテナ
make db-shell                                            # 自分のDBにpsqlで入る
docker compose -f infra/docker-compose.yml exec postgres psql -U app -l   # DB一覧
```

DynamoDB を使うアプリでは、Makefile の `SERVICES` に `dynamodb-local` を足したうえで：

```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region ap-northeast-1
```

## 自分のアプリのデータだけ初期化する

共有ボリュームを消さずに、対象アプリのDBだけ作り直す。

```bash
make stop     # backendがDBを掴んだままだとDROPできない
docker compose -f infra/docker-compose.yml exec postgres \
  psql -U app -d postgres -c 'DROP DATABASE <db_name>;'
make start    # DBが再作成され、Flywayが最初から流れる
```

## よくある詰まり

- **`Migration checksum mismatch`**: `.env` の `POSTGRES_DB` が他アプリと同じ。アプリ固有のDB名にする。
- **ポート衝突**: `lsof -nP -iTCP:5432 -sTCP:LISTEN` で確認。ホスト側に別のPostgresが居ないか。
- **backendがDBに繋がらない**: `application.yml` の接続先が `localhost:5432` を向いているか、
  コンテナが `up` か、対象DBが存在するか（`psql -l`）の順に確認。
- **コンテナが起動しない**: `docker compose -f infra/docker-compose.yml logs postgres` を見る。
- **既存コンテナが古い設定のまま**: `POSTGRES_DB` 等の環境変数は**初回のボリューム作成時にしか効かない**。
  後から `.env` を変えてもDBは自動で増えないので、`make start`（無ければCREATE DATABASE）に任せる。
