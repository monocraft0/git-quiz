# CLAUDE.md

このリポジトリは **フルスタックWebアプリのモノレポ・テンプレート** です。
このファイルに書かれた規約は、ここで作られるすべてのアプリに共通で適用されます。

## スタック

| レイヤ | 技術 |
| --- | --- |
| Frontend | TypeScript / React / Vite / Vitest / React Testing Library |
| Backend | Kotlin / Spring Boot / Gradle (Kotlin DSL) / JUnit5 |
| RDB | PostgreSQL（マイグレーションは **Flyway**） |
| KVS | DynamoDB（ローカルは **DynamoDB Local**、AWS SDK v2 Enhanced Client） |
| ローカル基盤 | Docker Compose（postgres / dynamodb-local / dynamodb-admin） |

## ディレクトリ構成

```
.
├── frontend/          React + Vite + TS
│   └── src/
│       ├── api/       APIクライアント（fetchラッパ）
│       └── features/  機能ごとにコンポーネント/フック/型/テストを同居
├── backend/           Spring Boot + Kotlin
│   └── src/main/kotlin/com/example/app/
│       ├── <feature>/ 機能ごとに controller/service/repository/dto を同居
│       └── config/    横断設定（DynamoDB, CORS など）
│   └── src/main/resources/db/migration/  Flyway SQL (V__)
├── infra/             docker-compose.yml と初期化スクリプト
├── docs/              図・補足資料（loop-flow.drawio = ループ1周の流れ）
│   └── adr/           設計判断の記録（ADR）。なぜそう決めたかを1判断1ファイルで残す
├── Makefile           ローカル起動タスク（make start が唯一の入口）
├── .claude/           ハーネス（commands / agents / skills）
└── .loop/             ループの永続状態（backlog / done / LOOP.md）
```

## 設計原則（全アプリ共通）

1. **機能単位でまとめる（package-by-feature）**。レイヤ横断のフォルダより機能フォルダを優先。
2. **層の責務を守る**: Controller=I/Oと検証 / Service=ビジネスロジック / Repository=永続化。Controllerにロジックを書かない。
3. **DTOとEntityを分ける**。APIの入出力にEntityを直接晒さない。
4. **フロントとバックの型を一致させる**。エンドポイント変更時は `frontend/src/**` の対応する型も更新する。
5. **秘密情報はコミットしない**。`.env` は `.env.example` を複製して使う。
6. **テストを先に書く（TDD）**。実装コードより先に落ちるテストを書き、**赤を実際に見てから**
   実装する。FE=Vitest、BE=JUnit5。サイクルと「何が正しい赤か」は
   `.claude/skills/tdd/SKILL.md`。対象外（設定・配線・見た目・リファクタ）もそこに定義がある。
7. **ローカル起動は Makefile に集約する**。起動手順を README や口頭に散らさず `make` ターゲットにする。
8. **他アプリを壊さない**。Postgresコンテナは全アプリ共有、**データベースだけアプリごと**に分ける。
   `POSTGRES_DB` はアプリ固有の名前にし、`docker compose down -v` は使わない。
9. **設計判断は ADR に残す**。後戻りが高い選択（依存の追加、永続化先、API契約の方針、
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
# FE/BE/DB をまとめて起動（推奨。個別に立てる必要があるときだけ下のコマンドを使う）
make start
make stop
make status

# ローカル基盤（Postgres / DynamoDB Local）起動
docker compose -f infra/docker-compose.yml up -d

# frontend
cd frontend && npm install && npm run dev      # http://localhost:5173
cd frontend && npm test                         # Vitest

# backend
cd backend && ./gradlew bootRun                  # http://localhost:8080
cd backend && ./gradlew test

# 赤→緑を回すときの内側ループ（片側だけ走らせる）
make test-backend
make test-frontend
```

## ハーネスの使い方

新しい機能やアプリを作るときは `.claude/` のコマンド／スキルを起点にする。

- `/setup-local` — `make start` でDB/backend/frontendを起動して疎通確認
- `/scaffold-feature <name>` — フロント〜バックを縦断する機能を一括生成
- `/new-endpoint <name>` — バックエンドのエンドポイント追加
- `/new-component <name>` — フロントエンドのコンポーネント追加
- `/new-migration <name>` — Flywayマイグレーション追加
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
（機械的なタスクは haiku）。`/work-next` 本体は実装を書かず、`backend-dev` /
`frontend-dev` に委譲する。配分表と理由は `.loop/LOOP.md`「モデル配分」。

規約の全文は `.loop/LOOP.md` を参照。

# Compact instructions

コンパクト時は次を優先して残す。

- いま取っているタスク（`.loop/backlog.md` のどの行か）と、どのゲートまで進んだか
- ゲートの**失敗内容**（エラー本文・失敗したテスト名）と、それに対して既に試したこと
- 追加/変更したファイルのパス

次は捨ててよい。**成功した**テスト/ビルドの出力、ファイル探索の経緯、
規約ファイル（`CLAUDE.md` / `SKILL.md` / `LOOP.md`）の引用。必要なら読み直せる。
