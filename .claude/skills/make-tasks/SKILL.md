---
name: make-tasks
description: Conventions for the repo's Makefile — the single entry point that starts the local dev server (`make start`), runs tests and builds. Use when adding or fixing Make targets, or when `make start` / `make stop` misbehaves.
---

# Makefile 規約

`make start` で開発サーバー(vite)が上がり、**実際に使える状態になるまで待ってから**制御が返る。
このアプリは BE / DB を持たない（docs/adr/0005）ので、起動対象は frontend だけ。

```
make start    開発サーバーを起動（http://localhost:5173）
make stop     開発サーバーを停止
make status   起動状態を表示
make logs     開発サーバーのログを追う
make test     Vitest
make build    型チェック込みビルド（BASE_PATH=/git-quiz/ で Pages 用）
make gate     test + build（完了判定）
make preview  ビルド結果をローカルで配信
```

起動はバックグラウンドで動き、ログは `.logs/`（gitignore対象）に出る。

## 規約

1. **起動手順を README や口頭に散らさない**。必ず `make` ターゲットにする。
2. **停止はポート単位**。`pkill -f vite` のようなプロセス名指定は、同時に動く他アプリを巻き込む。

   ```make
   # NG
   pkill -f vite
   # OK
   lsof -ti tcp:$(FRONTEND_PORT) -sTCP:LISTEN | xargs kill
   ```

3. **起動前にポートを確認する**。vite は使用中ポートを黙って避けて別ポートで上がるため、
   二重起動していると別URLで立ち上がってしまう。
4. **起動待ちは上限付き**。`curl` で応答を待ち、タイムアウトしたらログ末尾を出して失敗させる。
5. **`node_modules` が無ければ入れる**。clone 直後に `make test` だけ叩いても通るようにする。

## 症状と対処

- **画面が古いまま** → vite が別ポートで二重起動している。`make stop` → `make start`。
- **`port 5173 が別プロセスに使われています`** → `lsof -nP -iTCP:5173 -sTCP:LISTEN` で特定する。
