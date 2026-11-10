# gitクイズ — コマンドを打つと図が動く、git入門ミッション

gitのコマンドを実際に入力して、**作業ディレクトリ → ステージングエリア → リポジトリ**と
**コミットグラフ**が動く様子を見ながら学ぶ、初心者向けのクイズです。

- 各ミッションには「目標の状態」があります（例: `feature` ブランチを作ってコミットする）。
- 画面下のターミナルにコマンドを打つと、結果が図にすぐ反映されます。
- 「答え合わせ」は**コマンドの文字列ではなく結果の状態**で判定するので、別解でも正解になります。
- バックエンドもDBも無く、**ブラウザだけで動きます**（[ADR 0005](./docs/adr/0005-frontend-only-static-hosting.md)）。

## 動かす

前提: Node.js 20 以上。

```bash
make start      # 依存を入れて開発サーバーを起動 → http://localhost:5173
make stop
```

`make` を使わない場合:

```bash
cd frontend
npm install
npm run dev
```

## 使えるコマンド

`touch <file>` / `ls` / `help` / `clear` と、次の git コマンド。

| コマンド | 内容 |
| --- | --- |
| `git status` | 状態を見る |
| `git add <file>` / `git add .` | ステージに載せる |
| `git commit -m "<msg>"` | コミットする |
| `git branch [<name>]` | ブランチ一覧／作成（`-d` で削除） |
| `git switch [-c] <branch>` / `git checkout [-b] <branch>` | ブランチを切り替える |
| `git merge <branch>` | 取り込む（fast-forward / マージコミット） |
| `git log [--oneline]` | 履歴を見る |
| `git reset [--soft\|--mixed\|--hard] <commit>` | ブランチを過去へ戻す（`HEAD~1` など） |
| `git restore [--staged] <file>` | 変更／ステージを取り消す |

コンフリクトとリモート操作（`push` / `pull` / `clone`）には対応していません。

## テストとビルド

```bash
make test       # Vitest
make build      # 型チェック込みのビルド
make gate       # 上の両方
make preview    # ビルド結果をローカルで確認
```

## GitHub Pages で公開する

`.github/workflows/pages.yml` が、`main` への push ごとにテスト → ビルド → デプロイを行います。

1. リポジトリを **Public** にする（Private で Pages を使うには有料プランが必要）。
2. GitHub の **Settings → Pages → Source** を **GitHub Actions** にする。
3. `main` に push する。公開URLは `https://<ユーザー名>.github.io/<リポジトリ名>/`。

ビルド時に `BASE_PATH=/<リポジトリ名>/` を渡しているので、リポジトリ名を変えても追従します。
手元で同じ状態を再現するには:

```bash
cd frontend && BASE_PATH=/git-quiz/ npm run build && npm run preview
```

## ミッションを増やす

`frontend/src/features/missions/missions.ts` に1件足すだけです。

```ts
{
  id: 11,
  title: '…',
  description: '…',
  setupCommands: ['touch README.md', 'git add .', 'git commit -m "first commit"'], // 初期状態を作る
  goals: [{ type: 'BRANCH_EXISTS', branch: 'feature', description: 'feature ブランチがある' }],
  modelAnswer: ['git branch feature'],
  explanation: '…',
}
```

- 目標の種類: `HEAD_ON` / `BRANCH_EXISTS` / `STAGED` / `UNTRACKED` / `CLEAN` / `COMMIT_COUNT` / `CONTAINS`。
  コミットIDは初期化コマンドで変わるため、目標には書かないでください。
- `missions.test.ts` が全ミッションについて「初期状態では未クリア・模範解答でクリア」を検査します。
  ミッションを足したら、先頭の「10問」の件数も更新してください。

## 構成

```
frontend/src/features/
├── gitsim/     gitシミュレータ（gitSimulator.ts）、グラフ配置（layout.ts）、
│               ターミナル / 3エリア図 / コミットグラフのコンポーネントとCSS
└── missions/   ミッション定義（missions.ts）、判定（judge.ts）、出題画面（MissionPage.tsx）
docs/adr/       設計判断の記録
.claude/ .loop/ 開発ハーネスとループ（CLAUDE.md を参照）
```
