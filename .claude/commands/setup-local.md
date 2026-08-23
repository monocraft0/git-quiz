---
description: ローカル環境(DB/backend/frontend)を起動し、疎通確認まで行う
---

`make start` でアプリを使える状態にする。規約は `.claude/skills/make-tasks/SKILL.md`、
基盤まわりの詳細は `.claude/skills/local-dev/SKILL.md` を参照。

## 進め方

1. `make start` を実行する（`.env` 生成・DB作成・`npm install` まで面倒を見る）。
2. `make status` で database / backend / frontend の3つが running であることを確認する。
3. frontend 経由でAPIが引けること（viteプロキシが通っていること）を確認する。
   例: `curl -s http://localhost:5173/api/health`
4. 失敗したら**原因を切り分けてから**対処する。ログは `make logs-backend` / `make logs-frontend`。

## 失敗時の切り分け

| 症状 | 見るところ |
| --- | --- |
| `Migration checksum mismatch` | `.env` の `POSTGRES_DB` が他アプリと衝突している。アプリ専用のDB名になっているか |
| backendがタイムアウト | `make logs-backend`。DB接続先 / Flyway / ポート衝突 |
| `port XXXX が別プロセスに使われています` | `lsof -nP -iTCP:XXXX -sTCP:LISTEN` で特定。他アプリなら止めずにポートを変える判断も |
| 画面が古いまま | viteが別ポートで二重起動していないか（`make stop` → `make start`） |

**Postgresコンテナは他アプリと共有している**ので、勝手に `docker compose down` や `make db-down` をしない。
必要な場合は影響範囲を伝えてユーザーに確認する。

最後に、起動したURL（アプリ / API / DB）と、次に使うコマンド（`make logs` / `make stop`）を案内する。
