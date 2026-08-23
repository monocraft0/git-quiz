---
name: make-tasks
description: Conventions for the repo's Makefile — the single entry point that starts the whole local stack (database, backend, frontend) with `make start`. Use when adding or fixing Make targets, wiring a newly added service into startup, retrofitting a Makefile onto an app that lacks one, or when `make start` / `make stop` misbehaves.
---

# Makefile（ローカル起動タスク）

ルートの `Makefile` が**アプリを動かす唯一の入口**。
`make start` で DB → backend → frontend が順に上がり、**実際に使える状態になるまで待ってから**制御が返る。

```
make start    DB・backend・frontend を起動
make stop     backend・frontend を停止（DBコンテナは残す）
make status   3つの起動状態を表示
make logs     ログを追う
make test     JUnit5 + Vitest
make help     全ターゲット
```

backend / frontend はバックグラウンドで動き、ログは `.logs/`（gitignore対象）に出る。

## 変数（アプリ固有はここだけ）

Makefile本体はテンプレート共通。アプリごとに変えるのは先頭の変数だけにする。

| 変数 | 既定 | 用途 |
| --- | --- | --- |
| `SERVICES` | `postgres` | 起動するdockerサービス。DynamoDBを使うなら `postgres dynamodb-local dynamodb-admin` |
| `BACKEND_PORT` / `FRONTEND_PORT` / `DB_PORT` | 8080 / 5173 / 5432 | ポート |
| `DB_NAME` | ディレクトリ名（`-`→`_`） | `.env` の `POSTGRES_DB` が優先 |

`ROOT_DIR` をMakefile自身の絶対パスから解決しているので、**どのディレクトリから `make` しても動く**。
パスは必ず `$(ROOT_DIR)/...` で書く（相対パスにしない）。

## 守るべき規約

### 1. バックグラウンド起動は親のfdを漏らさない

```make
# NG: サブシェルが親のstdout(パイプ)を握り続け、`make start | tail` や CI が永久にハングする
cd frontend && npm run dev > ../.logs/frontend.log 2>&1 &

# OK: リダイレクトをサブシェル全体に掛け、stdinも切る
( cd $(ROOT_DIR)/frontend && npm run dev ) > $(LOG_DIR)/frontend.log 2>&1 < /dev/null &
```

`cmd > log &` は `cmd` のfdしか差し替えない。**背後のサブシェルは親のfd1を持ったまま**残るため、
`make start` をパイプやリダイレクトに繋いだ瞬間に詰まる。必ず `( ... ) > log 2>&1 < /dev/null &` の形にする。

### 2. 停止はプロセス名でなくポート単位

```make
# NG: 同時に動いている他アプリのbackendまで巻き添えで殺す
pkill -f "gradlew bootRun"

# OK: このアプリのポートを掴んでいるプロセスだけ止める
lsof -ti tcp:$(BACKEND_PORT) -sTCP:LISTEN | xargs kill
```

このテンプレートから作ったアプリは**同じマシンで並行して動く**前提。プロセス名は共通なので識別子にならない。

### 3. `make stop` は共有インフラを止めない

PostgreSQLコンテナ（`app-postgres`）は複数アプリで**1つを共有**し、データベースだけアプリごとに分ける。
そのため `make stop` が止めるのは backend / frontend のみ。コンテナを落とすのは `make db-down` に分離する。

### 4. 起動済みなら何もしない（冪等）

`make start` を二度叩いても二重起動しないこと。特に **vite は使用中ポートを黙って避けて別ポート(5174)で上がる**ため、
気づかないまま2つ動いてどちらを見ているか分からなくなる。起動前に必ずポートを確認する。

```make
if lsof -ti tcp:$(FRONTEND_PORT) -sTCP:LISTEN >/dev/null 2>&1; then echo "  すでに起動しています"; else ... fi
```

### 5. 使える状態まで待ち、失敗は即座に打ち切る

「起動コマンドを投げた」ではなく「**リクエストが通った**」で成功とする。
同時に、失敗を待ち続けない。backendのログに `BUILD FAILED` / `Application run failed` が出たら
タイムアウトを待たずにログ末尾を出して落ちる。

```make
for i in $$(seq 1 300); do \
  curl -sf http://localhost:$(BACKEND_PORT)/api/health >/dev/null 2>&1 && break; \
  if grep -qE "BUILD FAILED|Application run failed" $(LOG_DIR)/backend.log 2>/dev/null; then \
    echo "  起動に失敗しました:"; tail -20 $(LOG_DIR)/backend.log; exit 1; \
  fi; \
  sleep 1; \
done
```

### 6. データベースはアプリごとに分ける

PostgreSQLコンテナのボリュームは共有なので、`POSTGRES_DB=app` のまま複数アプリを動かすと
**別アプリのFlyway履歴と衝突して起動できなくなる**（`Migration checksum mismatch`）。

`env` ターゲットが `.env` 初回生成時に `POSTGRES_DB` をディレクトリ名で書き換える。
DB作成は「無ければ作る」だけにし、**既存DBを消す処理を書かない**（他アプリのデータを壊さないため）。

```make
$(COMPOSE) exec -T postgres psql -U $(DB_USER) -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='$(DB_NAME)'" | grep -q 1 \
  || $(COMPOSE) exec -T postgres psql -U $(DB_USER) -d postgres \
       -c "CREATE DATABASE $(DB_NAME) OWNER $(DB_USER);"
```

## サービスを追加するとき

新しいミドルウェア（Redis、ワーカー等）を足す手順：

1. `infra/docker-compose.yml` にサービスを追加。
2. Makefile の `SERVICES` に名前を足す。
3. `db` ターゲットに**そのサービスの疎通確認**を追加する（起動しただけで先に進まない）。
4. ポートを新設したら変数に切り出し、`stop` / `status` にも足す。
5. `make start` → `make status` → `make stop` → `make start` を通しで確認する。

## 動作確認のしかた

Makefileを変更したら最低限これを通す：

```bash
make start          # 初回
make start          # 二重起動しないこと
make status         # 3つとも running
make start | cat    # パイプに繋いでも終了すること（fd漏れの検出）
make stop && make status
make -C <repo> status   # 別ディレクトリから叩けること
```

## よくある詰まり

- **`make start` が返ってこない** → 規約1（fd漏れ）。`( ... ) > log 2>&1 < /dev/null &` になっているか確認。
- **backendが `Migration checksum mismatch` で落ちる** → 規約6。`.env` の `POSTGRES_DB` が他アプリと同じになっている。
- **画面を直したのに反映されない** → viteが5174等に逃げて2つ動いている。`make stop` してから `make start`。
- **他のアプリが突然落ちた** → 規約2または3。`pkill` や `docker compose down` を使っていないか確認。
