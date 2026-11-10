---
description: ローカル環境(frontend)を起動し、疎通確認まで行う
---

`make start` でアプリを使える状態にする。規約は `.claude/skills/make-tasks/SKILL.md` を参照。
このアプリは BE / DB を持たない（docs/adr/0005）。

## 進め方

1. `make start` を実行する（`npm install` から起動待ちまで面倒を見る）。
2. `make status` で frontend が running であることを確認する。
3. 失敗したら**原因を切り分けてから**対処する。ログは `make logs`。

## 失敗時の切り分け

| 症状 | 見るところ |
| --- | --- |
| `port 5173 が別プロセスに使われています` | `lsof -nP -iTCP:5173 -sTCP:LISTEN` で特定。他アプリなら止めずにポートを変える判断も |
| 画面が古いまま | viteが別ポートで二重起動していないか（`make stop` → `make start`） |
| GitHub Pages で真っ白 | `BASE_PATH` がリポジトリ名と一致しているか（`.github/workflows/pages.yml`） |

最後に、起動したURLと次に使うコマンド（`make logs` / `make stop`）を案内する。
