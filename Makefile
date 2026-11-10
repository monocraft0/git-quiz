# ローカル開発用タスク（フロントエンドのみ。BE / DB は持たない — docs/adr/0005）
#
#   make start   開発サーバー(vite)を起動し、使える状態まで待つ
#   make stop    開発サーバーを停止
#   make help    全ターゲットを表示
#
# 規約は .claude/skills/make-tasks/SKILL.md を参照。要点は2つ:
#   - vite は起動しっぱなしなのでバックグラウンドに回す
#   - 停止はプロセス名でなくポート単位（他アプリを巻き込まないため）

SHELL := /bin/bash
.DEFAULT_GOAL := help

# どのディレクトリから make しても動くよう、このMakefileの場所を基準にする。
ROOT_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
APP_NAME := $(notdir $(ROOT_DIR))
LOG_DIR  := $(ROOT_DIR)/.logs

FRONTEND_PORT ?= 5173

.PHONY: help start stop restart status logs frontend node-modules test test-frontend gate build preview clean

help: ## このヘルプを表示
	@echo "$(APP_NAME) — 使えるターゲット:"
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

## ---------------------------------------------------------------- 起動 / 停止

start: frontend ## 開発サーバーを起動してアプリを使える状態にする
	@echo ""
	@echo "  アプリ  http://localhost:$(FRONTEND_PORT)"
	@echo ""
	@echo "  ログ: make logs / 停止: make stop"

stop: ## 開発サーバーを停止する
	@# プロセス名(pkill -f vite 等)で殺すと同時に動く他アプリを巻き込むため、ポート単位で止める。
	@pids=$$(lsof -ti tcp:$(FRONTEND_PORT) -sTCP:LISTEN 2>/dev/null); \
	  if [ -n "$$pids" ]; then \
	    echo "  port $(FRONTEND_PORT) を停止 (pid: $$(echo $$pids | tr '\n' ' '))"; \
	    kill $$pids 2>/dev/null || true; \
	  fi
	@[ -f $(LOG_DIR)/frontend.pid ] && kill $$(cat $(LOG_DIR)/frontend.pid) 2>/dev/null; \
	  rm -f $(LOG_DIR)/frontend.pid; true
	@echo "停止しました"

restart: stop start ## 停止してから起動し直す

status: ## 開発サーバーの状態を表示
	@printf "  frontend   : "; \
	  curl -sf http://localhost:$(FRONTEND_PORT) >/dev/null 2>&1 \
	  && echo "running (http://localhost:$(FRONTEND_PORT))" || echo "stopped"

frontend: ## 開発サーバーだけ起動する（start の実体）
	@echo "▸ frontend"
	@mkdir -p $(LOG_DIR)
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

logs: ## 開発サーバーのログを追う
	@tail -f $(LOG_DIR)/frontend.log

## ---------------------------------------------------------------- テスト / ビルド

# test / build はループの機械ゲート（.loop/LOOP.md）でもある。clone 直後に make test だけ
# 叩いても通るよう、node_modules が無ければ入れる。
test: ## Vitest を実行する
	@$(MAKE) -s node-modules
	@cd $(ROOT_DIR)/frontend && npm test

test-frontend: test ## test の別名（赤→緑の内側ループ用。旧構成との互換）

gate: ## 完了判定用（テスト + 型チェック込みビルド）
	@$(MAKE) -s test
	@$(MAKE) -s build

build: ## 本番ビルド（型チェック込み）。BASE_PATH=/git-quiz/ で GitHub Pages 用
	@$(MAKE) -s node-modules
	@cd $(ROOT_DIR)/frontend && npm run build

preview: build ## ビルド結果をローカルで配信して確認する
	@cd $(ROOT_DIR)/frontend && npm run preview

node-modules: ## frontend の依存が無ければ入れる（内部用）
	@[ -d $(ROOT_DIR)/frontend/node_modules ] \
	  || { echo "  npm install 中…"; cd $(ROOT_DIR)/frontend && npm install >/dev/null; }

clean: stop ## 停止してビルド成果物とログを削除する
	@rm -rf $(ROOT_DIR)/frontend/dist $(ROOT_DIR)/frontend/*.tsbuildinfo $(LOG_DIR)
	@echo "削除しました"
