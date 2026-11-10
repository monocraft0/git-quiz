# CLAUDE.md

このリポジトリは **gitの操作を学ぶ、フロントエンドだけで動くクイズアプリ** です
（BE/DBは持たない。経緯は `docs/adr/0005`）。
このファイルに書かれた規約は、ここで作られる機能に共通で適用されます。

## スタック

| レイヤ | 技術 |
| --- | --- |
| Frontend | TypeScript / React / Vite / Vitest / React Testing Library |
| 配信 | GitHub Pages（`.github/workflows/pages.yml`。main への push でデプロイ） |

## ディレクトリ構成

```
.
├── frontend/          React + Vite + TS
│   └── src/features/
│       ├── gitsim/    gitの挙動を再現するシミュレータ + 図（3エリア・コミットグラフ・ターミナル）
│       └── missions/  ミッション定義・判定・出題画面
├── docs/              図・補足資料（loop-flow.drawio = ループ1周の流れ）
│   └── adr/           設計判断の記録（ADR）。なぜそう決めたかを1判断1ファイルで残す
├── Makefile           ローカル起動タスク（make start が唯一の入口）
├── .github/workflows/ GitHub Pages へのデプロイ
├── .claude/           ハーネス（commands / agents / skills）
└── .loop/             ループの永続状態（backlog / done / LOOP.md）
```

## 設計原則

1. **機能単位でまとめる（package-by-feature）**。レイヤ横断のフォルダより機能フォルダを優先。
2. **gitの挙動は純粋関数で持つ**。`gitsim/gitSimulator.ts` は state を書き換えず新しい state を返す。
   UIはその結果を描くだけで、gitのルールをコンポーネントに書かない。
3. **判定はコマンド列ではなく結果の状態で行う**。別解でも正解になる。
   ミッションの目標にコミットIDを書かない（初期化コマンドで変わる）。
4. **秘密情報はコミットしない**。このアプリに秘密情報は無いが、`.env` は追跡しない。
5. **テストを先に書く（TDD）**。実装コードより先に落ちるテストを書き、**赤を実際に見てから**
   実装する。Vitest。サイクルと「何が正しい赤か」は `.claude/skills/tdd/SKILL.md`。
   対象外（設定・配線・見た目・リファクタ）もそこに定義がある。
6. **ローカル起動は Makefile に集約する**。起動手順を README や口頭に散らさず `make` ターゲットにする。
7. **設計判断は ADR に残す**。後戻りが高い選択（依存の追加、配信方法、
   この原則からの逸脱）は `docs/adr/` に**なぜそう決めたか**を書く。索引は
   `docs/adr/README.md`、起票の基準は `.claude/skills/adr/SKILL.md`。

## 作業のしかた（エージェント向け）

上は「作るアプリ」の規約。ここは「作るときの手つき」の規約。

- **ファイルを読むときは Read ツールを使う**。bash の `cat` ループで読まない。
  Edit は同一会話での Read を要求するため、`cat` で読むと読み直しが発生して二重に払う。
- **ゲートの出力は絞られる**。`make test` / `make build` は PreToolUse フック
  （`.claude/hooks/filter-test-output.sh`）が失敗時だけ抜粋を返すよう書き換える。
  全文が要るときは `.logs/gate.log` を読む。
- **レビュー系エージェントを呼ぶ前に、機械的に確認できる点は自分で grep する**。
  手順書内の相互参照（番号の振り直し漏れ）、`.claude/settings.json` の許可リストに
  新しく使うコマンドが入っているか、相対リンクの解決——ここを先に潰すと、
  差し戻しのたびにレビュー担当がフルコンテキストを読み直すコストを払わずに済む。
- **実装を書く前に、赤いテストをコミットする**。テストだけのコミット
  （`test: <対象> — red`）を実装コミットの前に置く。順序は自己申告では検証できず、
  `code-reviewer` は履歴を見て**赤コミットの時点を再現する**。混ぜて1コミットにすると、
  そこで差し戻しになる。
- **PASS/完了が出たら、そこで止める**。`code-reviewer` は「Warning / Nits は残っていてよい」
  と明言している。PASS後にWarningまで自発的に直し続けると、レビューの往復が要らないぶん増える。
  直したいなら次のタスクとして切り出す。

## よく使うコマンド

```bash
make start      # 開発サーバー起動 http://localhost:5173
make stop
make status
make test       # Vitest（赤→緑の内側ループもこれ）
make build      # 型チェック込みビルド
make gate       # test + build（完了判定）

cd frontend && npm run dev
cd frontend && npx vitest run src/features/gitsim   # 片側だけ走らせる
```

## ハーネスの使い方

新しい機能やアプリを作るときは `.claude/` のコマンド／スキルを起点にする。

- `/setup-local` — `make start` で開発サーバーを起動して疎通確認
- `/new-component <name>` — フロントエンドのコンポーネント追加
- `/adr <題名>` — 設計判断をADRとして `docs/adr/` に起票

詳細は `.claude/skills/` 配下の各SKILL.mdを参照。
実装に入る前に読むのは `.claude/skills/tdd/SKILL.md`（赤→緑→リファクタの回し方）。

## ループ（loop engineering）

上のコマンド群が**ハーネス**（エージェント1体をうまく回す環境）なのに対し、
`.loop/` は**ループ**（人が指示を出さなくても回り続ける仕組み）を担う。

```
.loop/backlog.md  仕事の源泉。上から1件ずつ取る
.loop/done.md     完了ログ。文脈がリセットされても残る
.loop/LOOP.md     完了条件・差し戻し上限・禁止事項の定義
```

- `/find-work` — テスト失敗とTODOコメントを走査してバックログに積む（仕事の自動発見）
- `/work-next` — バックログの先頭を1件、完了条件を満たすまで実装する（1周ぶん）
- `/loop /work-next` — バックログが尽きるまで自走させる

新機能は人が `backlog.md` に書く。`/find-work` が拾うのは**既にある不備**だけ。

**完了条件は2段**。`make test && make build` が緑、**かつ** `code-reviewer` が
`PASS` を返すこと。実装したモデルに自分で合格を出させない。

**着手条件は赤**。実装スライスは落ちるテストから始め、赤いテストだけのコミットを
枝に残す。緑は「テストが通った」証拠でしかなく、**赤を見ていないテストは
何も守っていないことがある**（実測: 差し戻し10回中8回がこの型）。
`code-reviewer` は履歴上の赤コミットを再現して確かめる。規約は
`.claude/skills/tdd/SKILL.md` と `.loop/LOOP.md`「赤を先に見る」。

**設計判断を伴う周は ADR が1件残る**。`/work-next` が分解の時点で要否を判定し、
オーケストレータ自身が枝の上に書く。`code-reviewer` は「判断があるのにADRが無い」を
Blocker として扱う。基準は `.claude/skills/adr/SKILL.md`。

**モデルは役割で分ける**。分解・判断・統合と合否判定は opus、実装は sonnet
（機械的なタスクは haiku）。`/work-next` 本体は実装を書かず、`frontend-dev` に委譲する。配分表と理由は `.loop/LOOP.md`「モデル配分」。

規約の全文は `.loop/LOOP.md` を参照。

# Compact instructions

コンパクト時は次を優先して残す。

- いま取っているタスク（`.loop/backlog.md` のどの行か）と、どのゲートまで進んだか
- ゲートの**失敗内容**（エラー本文・失敗したテスト名）と、それに対して既に試したこと
- 追加/変更したファイルのパス

次は捨ててよい。**成功した**テスト/ビルドの出力、ファイル探索の経緯、
規約ファイル（`CLAUDE.md` / `SKILL.md` / `LOOP.md`）の引用。必要なら読み直せる。
