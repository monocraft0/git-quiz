# loop-eng-temple — ループエンジニアリングのテンプレート

**エージェントに指示を打ち続けるのをやめ、打ち続ける「ループ」のほうを設計する**ための
フルスタック・モノレポ・テンプレート。これをコピーしてアプリを量産する。

土台は**ハーネス設計**。`.claude/` にコマンド / エージェント / スキルを積み、
エージェント1体が規約どおりに動く環境を先に固めてある。
その上に `.loop/` を載せ、**人が次の指示を出さなくても回り続ける仕組み**にしたのがこのテンプレート。

```
プロンプト → コンテキスト → ハーネス → ループ
                            ~~~~~~~~   ~~~~~~
                            .claude/   .loop/
                     1体をうまく回す   回し続ける
```

| 層 | 置き場 | 担うこと |
| --- | --- | --- |
| **ハーネス** | `.claude/` | 規約の固定（skills）、役割分担（agents）、定型作業（commands） |
| **ループ** | `.loop/` | 仕事の源泉（backlog）、完了の定義（LOOP.md）、記録（done） |

スタックは React + Vite + TypeScript / Spring Boot + Kotlin / PostgreSQL(Flyway) + DynamoDB。

## 構成

```
.
├── frontend/   React + Vite + TS（health機能を参考実装として同梱）
├── backend/    Spring Boot + Kotlin（/api/health を同梱）
├── infra/      docker-compose（postgres / dynamodb-local / dynamodb-admin）
├── docs/adr/   設計判断の記録（ADR）。なぜそう決めたかを1判断1ファイルで残す
├── Makefile    ローカル起動タスク（make start が唯一の入口）
├── .claude/    ハーネス: commands / agents / skills
├── .loop/      ループ: backlog / done / LOOP.md
└── CLAUDE.md   全アプリ共通の規約
```

## はじめ方

### 前提

Docker（稼働中） / Node.js / **JDK 21**。Gradle 8.10.2 は wrapper が自動で取得する。

### 1. コピーして新しいアプリにする

```bash
git clone https://github.com/monocraft0/loop-eng-temple.git my-app
cd my-app
rm -rf .git && git init && git add -A && git commit -m "init from loop-eng-temple"
```

**ディレクトリ名がそのままデータベース名になる**（`my-app` → `my_app`）。
PostgreSQLのコンテナは全アプリで共有し、分離されるのはデータベース単位なので、
アプリごとに違う名前のディレクトリに置く。

### 2. 起動して疎通を確認する

```bash
make start
```

`.env` の生成、DBコンテナ起動、**アプリ専用データベースの作成**、`npm install`、
起動待ちまで面倒を見る。初回は依存のダウンロードで数分かかる。
http://localhost:5173 が開けばここは完了。

### 3. ベースラインのゲートを緑にする

```bash
make test && make build
```

**これがループの機械ゲートそのもの**。ここが赤い状態でループを回すと、
エージェントは自分が壊していない問題を延々と直そうとする。**着手前に必ず緑にする。**

### 4. 最初のタスクを backlog に書く

`.loop/backlog.md` に**1周で終わる粒度**で書く。「認証基盤一式」ではなく
「ログインAPI + ログインフォーム」まで割る。粒度が大きいとゲートに到達する前に文脈が尽きる。

```markdown
- [ ] TODO一覧API GET /api/todos と一覧画面
      db: postgres
      見て確かめること: 画面を開くと登録済みのTODOが一覧で並び、0件なら「まだありません」と出る
```

`見て確かめること:` は**省略不可**。人がコードを読まずに確認できる形で書く。
ループはこれを**テストリスト**（実行できるテストの一覧）に翻訳してから実装に入る。

新機能は**人が書く**。ここだけは自動化しない。

### 5. まず1周だけ手で回す

```
/work-next
```

いきなり自走させない。最初の1周で見るのは**成果物ではなくループの挙動**。

- 着手前に `git status` を確認したか（汚れていたら止まるのが正しい）
- `loop/<slug>` の枝が切られたか
- **実装より先に `test: … — red` のコミットが積まれたか**（`git log --oneline main..loop/<slug>`）
- `code-reviewer` が**1行目に `判定: PASS`** を返したか — ここが返らないとゲートが機能していない
- base に戻って `merge --no-ff` したか
- `.loop/done.md` への追記が **base 側にコミット**されたか

### 6. 自走させる

1周の挙動に納得できたら、バックログを積んで回す。

```
/loop /work-next
```

### 7. 既存の不備を拾わせる

```
/find-work
```

`make test` の失敗とコード内の `TODO` / `FIXME` を走査して backlog に積む。
拾えるのは**既にある不備**だけで、新機能は拾えない。

## ループ

```
.loop/backlog.md   仕事の源泉。ループは上から1件ずつ取る
.loop/done.md      完了ログ。モデルの文脈がリセットされても残る
.loop/LOOP.md      完了条件・差し戻し上限・ブランチ運用・禁止事項
```

| コマンド | 用途 |
| --- | --- |
| `/find-work` | テスト失敗と `TODO` / `FIXME` を走査してバックログに積む（仕事の自動発見） |
| `/work-next` | バックログの先頭を1件、完了条件を満たすまで実装する（1周ぶん） |
| `/loop /work-next` | バックログが尽きるまで自走させる |

### 1周の流れ

```
backlog の先頭を取る → loop/<slug> を切る → テストリストを作る
  → 実装        赤 → 緑 → リファクタ を1件ずつ（赤はテストだけのコミットで残す）
  → ADR         設計判断を含む周だけ         （opus が枝の上に1件書く）
  → 機械ゲート  make test && make build      （赤なら差し戻し、最大3回）
  → verifier    code-reviewer が PASS/FAIL   （FAILなら差し戻し、最大3回）
  → 出力ゲート  成果物を実際に見る            （見て確かめること を満たすまで）
  → base に merge --no-ff → backlog から削除 → done に追記
```

**完了条件は2段**。テストが緑なだけでは完了にしない。`code-reviewer` を別エージェントとして
呼び、`PASS` を得るまで差し戻す。実装したモデルは自分の宿題を採点するには優しすぎるため、
**採点者を分ける**。ループのボトルネックはモデルではなく検証器。

**着手条件は赤**。実装は落ちるテストから始め、テストだけのコミット
（`test: <対象> — red (<テスト名>)`）を実装コミットの前に残す。
実測では差し戻し10回のうち**8回**が「テストが同語反復で何も守っていなかった」型で、
機械ゲートもコードを読むレビューもこれを検出できなかった。
**実装より先に書いたテストは、赤を見た時点でその性質を証明済み**なので、
順序そのものを規約にしてある。`code-reviewer` は履歴の赤コミットを
チェックアウトして**本当に赤かったかを再現する**（自己申告は信じない）。
書き方は [`.claude/skills/tdd/SKILL.md`](.claude/skills/tdd/SKILL.md)。

**設計判断は `docs/adr/` に残る**。後戻りが高い選択（依存の追加、永続化先、API契約の方針）を
した周は、オーケストレータ自身がADRを1件書く。`code-reviewer` は「判断があるのにADRが無い」を
Blocker として扱う。文脈がリセットされても**なぜそう決めたか**が残り、次の周が平気で覆せなくなる。

3回落ちたタスクは **blocked** として枝ごと捨て、理由だけを backlog に残してループを止める。
`push` と PR 作成はしない。外向きの操作は人の判断を待つ。

無人で回すための許可リストは `.claude/settings.json`。
`git reset --hard` / `git clean` / `git branch -D` は**意図的に含めていない**。
これらが要るのは blocked のときだけで、承認プロンプトが出る瞬間と人が見るべき瞬間を一致させている。

> ### ⚠ ループは理解を代わりに育ててはくれない
>
> `done.md` が伸びているのに中身を読んでいないなら、それは理解のギャップが開いた合図。
> 同じ `blocked:` が繰り返し出るなら、直すのはループではなく `.claude/skills/` の記述。

規約の全文は [`.loop/LOOP.md`](.loop/LOOP.md)。

## ハーネス

| コマンド | 用途 |
| --- | --- |
| `/setup-local` | `make start` で一式起動して疎通確認 |
| `/scaffold-feature <name>` | フロント〜バックを縦断する機能を一括生成 |
| `/new-endpoint <name>` | バックエンドのエンドポイント追加 |
| `/new-component <name>` | フロントエンドの機能/コンポーネント追加 |
| `/new-migration <name>` | Flyway / DynamoDB のスキーマ変更 |
| `/adr <title>` | 設計判断を `docs/adr/` にADRとして起票 |

| エージェント | 役割 |
| --- | --- |
| `backend-dev` | Spring Boot + Kotlin 実装 |
| `frontend-dev` | React + Vite + TS 実装 |
| `code-reviewer` | 規約準拠レビューと **PASS / FAIL 判定**（読み取り専用。ループの verifier） |

| スキル | 内容 |
| --- | --- |
| `tdd` | 赤 → 緑 → リファクタ / 何が正しい赤か / 赤コミットの残し方 |
| `backend-endpoint` | レイヤ構成 / DTO / 検証 / 永続化 |
| `frontend-feature` | 機能フォルダ / 型同期 / フック / テスト |
| `db-migration` | Flyway / DynamoDBテーブル |
| `local-dev` | 基盤の構造と復旧（共有DBの扱い） |
| `make-tasks` | Makefileの規約（起動タスクの追加・修正） |
| `adr` | 設計判断の記録（起票の基準 / 書式 / supersede） |

コマンド／エージェントはスキルを参照する。ループを使わず、`/scaffold-feature` などを
手で叩いて開発してもよい。**ループは速く回すための選択肢であって、必須ではない**。

## ローカル環境

| コマンド | 用途 |
| --- | --- |
| `make start` | DB・backend・frontend を起動 |
| `make stop` | backend・frontend を停止（DBコンテナは残す） |
| `make restart` / `make status` / `make logs` | 再起動 / 起動状態 / ログ追尾 |
| `make db-shell` / `make test` / `make build` / `make clean` | psql / テスト / ビルド / 掃除 |
| `make test-backend` / `make test-frontend` | 片側だけテストする（赤→緑を1件ずつ回す内側ループ用） |
| `make gate` | 完了判定用。キャッシュを使わずテストとビルドを必ず実行する |

`make help` で全ターゲットを表示。backend / frontend はバックグラウンドで動き、ログは `.logs/` に出る。

### アプリごとの設定

Makefile 冒頭の変数だけを変える。それ以外は全アプリ共通に保つ。

| 変数 | 既定 | 変えるとき |
| --- | --- | --- |
| `SERVICES` | `postgres` | DynamoDBを使うなら `postgres dynamodb-local dynamodb-admin` |
| `BACKEND_PORT` / `FRONTEND_PORT` | 8080 / 5173 | 複数アプリを同時に動かしてポートが衝突するとき |

規約は `.claude/skills/make-tasks/SKILL.md` を参照。

> ### ⚠ データベースはアプリごとに分ける
>
> このテンプレートから作ったアプリは **PostgreSQL のコンテナとボリュームを1つ共有**し、
> 分離されるのは**データベース単位**。`POSTGRES_DB` を共有したまま複数アプリを動かすと、
> 別アプリの Flyway 履歴と衝突して `Migration checksum mismatch` で起動できなくなる。
>
> `make start` が `.env` 初回生成時に `POSTGRES_DB` をディレクトリ名で埋めるので通常は意識不要。
> ただし **`make stop` はDBコンテナを止めない**（他アプリを巻き添えにしないため）。
> 止めるなら `make db-down`、**`docker compose down -v` は全アプリのデータを消すので使わない**。

### 手動で起動する場合

```bash
cp .env.example .env && cp frontend/.env.example frontend/.env   # POSTGRES_DB をアプリ名に変更する
docker compose -f infra/docker-compose.yml up -d postgres
cd backend  && ./gradlew bootRun          # → http://localhost:8080/api/health
cd frontend && npm install && npm run dev # → http://localhost:5173
```

## 参考実装: health 機能

規約（package-by-feature / DTO分離 / フック隔離 / 型同期 / テスト同梱）の見本として、
`GET /api/health` とそれを表示する `HealthPage` を縦断で同梱。新機能を作る際の雛形として参照する。

**このhealth機能自体は赤コミットを持たない**（TDDを規約にする前に置いたもの）。
形の見本として読むのはよいが、履歴を「テスト先行の実例」として参照しないこと。
ここから作る機能は [`.claude/skills/tdd/SKILL.md`](.claude/skills/tdd/SKILL.md) に従って
赤から始める。


test
test2
test2-1
