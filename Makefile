# ローカル開発用タスク
#
#   make start   DB → backend → frontend を順に起動し、使える状態まで待つ
#   make stop    backend / frontend を停止（DBコンテナは他アプリと共有なので残す）
#   make help    全ターゲットを表示
#
# 規約は .claude/skills/make-tasks/SKILL.md を参照。要点は3つ:
#   - backend(bootRun) も frontend(vite) も起動しっぱなしなのでバックグラウンドに回す
#   - 停止はプロセス名でなくポート単位（他アプリを巻き込まないため）
#   - PostgreSQLコンテナは複数アプリで共有し、データベースだけアプリごとに分ける

SHELL := /bin/bash
.DEFAULT_GOAL := help

# どのディレクトリから make しても動くよう、このMakefileの場所を基準にする。
ROOT_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
APP_NAME := $(notdir $(ROOT_DIR))

COMPOSE  := docker compose -f $(ROOT_DIR)/infra/docker-compose.yml
LOG_DIR  := $(ROOT_DIR)/.logs
ENV_FILE := $(ROOT_DIR)/.env

# 起動する docker サービス。DynamoDB を使うアプリは dynamodb-local dynamodb-admin を足す。
SERVICES ?= postgres

BACKEND_PORT  ?= 8080
FRONTEND_PORT ?= 5173
DB_PORT       ?= 5432

# データベース名はアプリごとに分ける（既定はディレクトリ名。SQL識別子に合わせて - は _ に）。
# .env があればそちらが優先。初回の .env 生成時にこの既定値が書き込まれる。
DB_NAME_DEFAULT := $(subst -,_,$(APP_NAME))
DB_NAME := $(or $(shell sed -n 's/^POSTGRES_DB=//p' $(ENV_FILE) 2>/dev/null),$(DB_NAME_DEFAULT))
DB_USER := $(or $(shell sed -n 's/^POSTGRES_USER=//p' $(ENV_FILE) 2>/dev/null),app)
DB_PASS := $(or $(shell sed -n 's/^POSTGRES_PASSWORD=//p' $(ENV_FILE) 2>/dev/null),app)

# backend は Spring から環境変数として読む。.env を単一の真実にするため make が渡す
# （素の `./gradlew bootRun` は application.yml の既定値にフォールバックする点に注意）。
DB_ENV := POSTGRES_DB=$(DB_NAME) POSTGRES_USER=$(DB_USER) POSTGRES_PASSWORD=$(DB_PASS)

.PHONY: help start stop restart status logs logs-backend logs-frontend \
        env db db-shell db-down backend frontend node-modules test test-backend \
        test-frontend gate build clean

help: ## このヘルプを表示
	@echo "$(APP_NAME) — 使えるターゲット:"
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

## ---------------------------------------------------------------- 起動 / 停止

start: env db backend frontend ## DB・backend・frontend を起動してアプリを使える状態にする
	@echo ""
	@echo "  アプリ      http://localhost:$(FRONTEND_PORT)"
	@echo "  API        http://localhost:$(BACKEND_PORT)/api"
	@echo "  PostgreSQL localhost:$(DB_PORT) (db=$(DB_NAME))"
	@echo ""
	@echo "  ログ: make logs / 停止: make stop"

stop: ## backend と frontend を停止する（DBコンテナは残す）
	@# プロセス名(pkill -f gradlew 等)で殺すと同時に動く他アプリを巻き込むため、ポート単位で止める。
	@for port in $(BACKEND_PORT) $(FRONTEND_PORT); do \
	  pids=$$(lsof -ti tcp:$$port -sTCP:LISTEN 2>/dev/null); \
	  if [ -n "$$pids" ]; then \
	    echo "  port $$port を停止 (pid: $$(echo $$pids | tr '\n' ' '))"; \
	    kill $$pids 2>/dev/null || true; \
	  fi; \
	done
	@for f in $(LOG_DIR)/backend.pid $(LOG_DIR)/frontend.pid; do \
	  [ -f $$f ] && kill $$(cat $$f) 2>/dev/null; rm -f $$f; \
	done; true
	@echo "停止しました（DBコンテナは起動したままです。落とすなら make db-down）"

restart: stop start ## 停止してから起動し直す

status: ## 各プロセスの状態を表示
	@printf "  database   : "; \
	  $(COMPOSE) ps --status running --services 2>/dev/null | grep -qx postgres \
	  && echo "running (localhost:$(DB_PORT), db=$(DB_NAME))" || echo "stopped"
	@printf "  backend    : "; \
	  curl -sf http://localhost:$(BACKEND_PORT)/api/health >/dev/null 2>&1 \
	  && echo "running (http://localhost:$(BACKEND_PORT))" || echo "stopped"
	@printf "  frontend   : "; \
	  curl -sf http://localhost:$(FRONTEND_PORT) >/dev/null 2>&1 \
	  && echo "running (http://localhost:$(FRONTEND_PORT))" || echo "stopped"

## ---------------------------------------------------------------- 個別の起動

env: ## .env を用意する（既にあれば何もしない）
	@if [ ! -f $(ENV_FILE) ]; then \
	  sed 's/^POSTGRES_DB=.*/POSTGRES_DB=$(DB_NAME_DEFAULT)/' $(ROOT_DIR)/.env.example > $(ENV_FILE); \
	  echo "  .env を作成しました (POSTGRES_DB=$(DB_NAME_DEFAULT))"; \
	fi
	@[ -f $(ROOT_DIR)/frontend/.env ] \
	  || { cp $(ROOT_DIR)/frontend/.env.example $(ROOT_DIR)/frontend/.env; echo "  frontend/.env を作成しました"; }
	@mkdir -p $(LOG_DIR)

db: env ## DBコンテナを起動し、このアプリ用のデータベースが無ければ作る
	@echo "▸ infra ($(SERVICES))"
	@$(COMPOSE) up -d $(SERVICES) >/dev/null
	@if echo " $(SERVICES) " | grep -q " postgres "; then \
	  for i in $$(seq 1 60); do \
	    $(COMPOSE) exec -T postgres pg_isready -U $(DB_USER) >/dev/null 2>&1 && break; \
	    [ $$i = 60 ] && { echo "  PostgreSQL に接続できませんでした"; exit 1; }; sleep 1; \
	  done; \
	  echo "  postgres ready (localhost:$(DB_PORT), db=$(DB_NAME))"; \
	fi
	@# このコンテナは他アプリとボリュームを共有しうる。既存DBは消さず、無ければ作るだけ。
	@if echo " $(SERVICES) " | grep -q " postgres "; then \
	  $(COMPOSE) exec -T postgres psql -U $(DB_USER) -d postgres -tAc \
	      "SELECT 1 FROM pg_database WHERE datname='$(DB_NAME)'" | grep -q 1 \
	    || { $(COMPOSE) exec -T postgres psql -U $(DB_USER) -d postgres \
	           -c "CREATE DATABASE $(DB_NAME) OWNER $(DB_USER);" >/dev/null; \
	         echo "  データベース $(DB_NAME) を作成しました"; }; \
	fi
	@if echo " $(SERVICES) " | grep -q " dynamodb-local "; then \
	  for i in $$(seq 1 60); do \
	    curl -s -o /dev/null http://localhost:8000 && break; \
	    [ $$i = 60 ] && { echo "  DynamoDB Local に接続できませんでした"; exit 1; }; sleep 1; \
	  done; \
	  [ -f $(ROOT_DIR)/infra/dynamodb/create-tables.sh ] \
	    && bash $(ROOT_DIR)/infra/dynamodb/create-tables.sh >/dev/null 2>&1 || true; \
	  echo "  dynamodb-local ready (localhost:8000)"; \
	fi

backend: env ## backend だけ起動する（Flywayマイグレーションもここで走る）
	@echo "▸ backend"
	@if curl -sf http://localhost:$(BACKEND_PORT)/api/health >/dev/null 2>&1; then \
	  started=$$(grep -a "Started .*Application" $(LOG_DIR)/backend.log 2>/dev/null | tail -1 | awk '{print $$1}'); \
	  echo "  すでに起動しています（起動: $${started:-不明}）"; \
	  echo "  ※ このターゲットは再起動しません。コード変更を反映するには make restart"; \
	elif lsof -ti tcp:$(BACKEND_PORT) -sTCP:LISTEN >/dev/null 2>&1; then \
	  echo "  port $(BACKEND_PORT) が別プロセスに使われています"; exit 1; \
	else \
	  ( cd $(ROOT_DIR)/backend && $(DB_ENV) ./gradlew bootRun ) > $(LOG_DIR)/backend.log 2>&1 < /dev/null & \
	  echo $$! > $(LOG_DIR)/backend.pid; \
	  for i in $$(seq 1 300); do \
	    curl -sf http://localhost:$(BACKEND_PORT)/api/health >/dev/null 2>&1 && break; \
	    if grep -qE "BUILD FAILED|Application run failed" $(LOG_DIR)/backend.log 2>/dev/null; then \
	      echo "  起動に失敗しました:"; tail -20 $(LOG_DIR)/backend.log; exit 1; \
	    fi; \
	    sleep 1; \
	  done; \
	  curl -sf http://localhost:$(BACKEND_PORT)/api/health >/dev/null 2>&1 \
	    || { echo "  タイムアウトしました。make logs-backend を確認してください"; exit 1; }; \
	  echo "  ready (http://localhost:$(BACKEND_PORT))"; \
	fi

frontend: env ## frontend だけ起動する
	@echo "▸ frontend"
	@$(MAKE) -s node-modules
	@# vite は使用中ポートを黙って避けて別ポートで上がるので、先に確認して二重起動を防ぐ。
	@if lsof -ti tcp:$(FRONTEND_PORT) -sTCP:LISTEN >/dev/null 2>&1; then \
	  echo "  すでに起動しています"; \
	else \
	  ( cd $(ROOT_DIR)/frontend && npm run dev ) > $(LOG_DIR)/frontend.log 2>&1 < /dev/null & \
	  echo $$! > $(LOG_DIR)/frontend.pid; \
	  for i in $$(seq 1 60); do \
	    curl -sf http://localhost:$(FRONTEND_PORT) >/dev/null 2>&1 && break; sleep 1; \
	  done; \
	  curl -sf http://localhost:$(FRONTEND_PORT) >/dev/null 2>&1 \
	    || { echo "  起動できませんでした:"; tail -20 $(LOG_DIR)/frontend.log; exit 1; }; \
	  echo "  ready (http://localhost:$(FRONTEND_PORT))"; \
	fi

## ---------------------------------------------------------------- ログ / DB / その他

logs: ## backend と frontend のログを追う
	@tail -f $(LOG_DIR)/backend.log $(LOG_DIR)/frontend.log

logs-backend: ## backend のログを追う
	@tail -f $(LOG_DIR)/backend.log

logs-frontend: ## frontend のログを追う
	@tail -f $(LOG_DIR)/frontend.log

db-shell: ## psql に入る
	@$(COMPOSE) exec postgres psql -U $(DB_USER) -d $(DB_NAME)

db-down: ## DBコンテナを停止する（他アプリと共有している場合は注意）
	@$(COMPOSE) stop $(SERVICES)

# test / build はループの機械ゲート（.loop/LOOP.md）でもある。ゲートが「コードの正しさ」
# ではなく環境差で赤くなると、ループは直せない問題に何周も突っ込む。だから前提を自前で揃える:
#   - DB_ENV を渡す。渡さないと @DataJpaTest 等が application.yml の既定値(POSTGRES_DB=app)に
#     フォールバックし、他アプリのデータベースに接続してしまう（設計原則8違反）。
#   - node_modules が無ければ入れる。clone直後に make test だけ叩いても通るように。
test: env ## backend(JUnit5) と frontend(Vitest) のテストを実行（開発中の素早い確認用）
	@# 注意: このターゲットは DB を起動しない。@SpringBootTest / @DataJpaTest は
	@# コンテキスト起動に失敗するため使えない。スキーマと Entity のズレ（ddl-auto=validate）は
	@# ここでは検出できず、実機起動でしか出ない。
	@# 完了判定には make gate を使う（Gradle のキャッシュを避ける）。
	@# 赤→緑を1件ずつ回すときは make test-backend / make test-frontend で片側だけ走らせる。
	@cd $(ROOT_DIR)/backend && $(DB_ENV) ./gradlew test
	@$(MAKE) -s node-modules
	@cd $(ROOT_DIR)/frontend && npm test

test-backend: env ## backend のテストだけ実行（赤→緑の内側ループ用）
	@cd $(ROOT_DIR)/backend && $(DB_ENV) ./gradlew test --rerun-tasks

test-frontend: env ## frontend のテストだけ実行（赤→緑の内側ループ用）
	@$(MAKE) -s node-modules
	@cd $(ROOT_DIR)/frontend && npm test

gate: env ## 完了判定用のテスト（キャッシュを使わず必ず実行する）
	@# Gradle は UP-TO-DATE で test をスキップするため、緑を判定に使うときは
	@# 必ず --rerun-tasks を付ける。付け忘れて古い結果を緑と誤認する事故が実際に起きた。
	@cd $(ROOT_DIR)/backend && $(DB_ENV) ./gradlew test --rerun-tasks
	@$(MAKE) -s node-modules
	@cd $(ROOT_DIR)/frontend && npm test
	@$(MAKE) -s build

build: env ## 本番ビルド（フロントは型チェック込み）
	@cd $(ROOT_DIR)/backend && $(DB_ENV) ./gradlew build
	@$(MAKE) -s node-modules
	@cd $(ROOT_DIR)/frontend && npm run build

node-modules: ## frontend の依存が無ければ入れる（内部用）
	@[ -d $(ROOT_DIR)/frontend/node_modules ] \
	  || { echo "  npm install 中…"; cd $(ROOT_DIR)/frontend && npm install >/dev/null; }

clean: stop ## 停止してビルド成果物とログを削除する
	@cd $(ROOT_DIR)/backend && ./gradlew clean >/dev/null
	@rm -rf $(ROOT_DIR)/frontend/dist $(ROOT_DIR)/frontend/*.tsbuildinfo $(LOG_DIR)
	@echo "削除しました"
