---
name: adr
description: Conventions for Architecture Decision Records in docs/adr/ — when a change is decision-worthy enough to need one, the MADR-style file format and numbering, how to supersede an earlier decision, and how ADRs differ from the loop's other records. Use when a design decision is made or changed, when writing or reviewing an ADR, or when judging whether one is required.
---

# ADR（設計判断の記録）

`docs/adr/` に**なぜそう決めたか**を1判断1ファイルで残す。雛形は `docs/adr/_template.md`、
索引は `docs/adr/README.md`。

ループは文脈をリセットしながら回る。判断の理由が残っていないと、次の周は
コードから逆算できずに平気で覆す。ADRは**次の周のモデルに向けた記録**であって、
人間向けの議事録ではない。導入の経緯は [ADR 0001](../../../docs/adr/0001-record-architecture-decisions.md)。

## 記録の役割分担

ADRに書くことを他所に書かない。他所に書くことをADRに書かない。

| 場所 | 何を持つか |
| --- | --- |
| `.claude/skills/` | **どうやるか**。いま従うべき結論だけを短く保つ |
| `.loop/backlog.md` | **何をするか**。未着手の仕事 |
| `.loop/done.md` | **何が終わったか**。1周1エントリの完了ログ |
| `docs/adr/` | **なぜそう決めたか**。判断の文脈・代替案・受け入れたコスト |

## ADRにするもの

**後戻りのコストが高い**か、**選択肢が複数あった**もの。

- 依存の追加・削除（ライブラリ / コンテナ / 外部サービス）
- 永続化・配信方法の選択（localStorage / 外部サービス / ホスティング先）、ID体系
- API契約の方針（エラー表現、ページング、認証方式）
- ルート `CLAUDE.md` の設計原則からの**意図的な逸脱**、または原則そのものの変更
- ハーネス／ループ自体の**規約**変更（`.loop/LOOP.md` / `.claude/agents/` / `.claude/skills/`）。
  ただし対象は「規約の意味が変わる編集」だけ。**同じファイルでも文言・例・整形・誤字の修正は対象外**

## ADRにしないもの

ここが緩いと `code-reviewer` が誤爆し、差し戻し上限3回を無駄に溶かす。**狭く取る**。

- 命名・整形・ファイル分割
- 選択肢が1つしか無かったもの（規約に従っただけ）
- 既存ADRの範囲内の実装
- **規約ファイルを触っただけ**で、規約の意味は変えていない編集（言い換え・例の追加・誤字）

> 迷ったら「半年後の自分が、この選択を見て**理由を思い出せないと困る**か」で決める。
> 困らないなら書かない。ADRが増えすぎると誰も読まなくなり、無いのと同じになる。

## 書式

frontmatter + 4つの節（文脈 / 決定 / 結果 / 検討した代替案）。`docs/adr/_template.md` を写す。

| フィールド | 値 |
| --- | --- |
| `id` | 4桁ゼロ埋め。**引用符付き**（`"0003"`。裸だと整数に読まれる）。ファイル名の連番と**必ず一致させる** |
| `title` | 日本語1行。「〜する」で終える |
| `status` | `proposed` \| `accepted` \| `superseded` |
| `date` | `date +%F` で取る |
| `tags` | `frontend` / `infra` / `harness` から該当するもの |
| `branch` | `loop/<slug>`。ループが起票した場合のみ。人が書いた場合は省略 |
| `superseded-by` | 覆されたときだけ足す。覆した側の `id` |

### 採番とファイル名

既存の最大番号は **Glob（`docs/adr/[0-9]*.md`）** で取る。
`ls` を Bash で叩かない — `.claude/settings.json` の許可リストに無く、無人の周が承認待ちで止まる。

`_` 始まりのファイル（`_template.md`）は採番にも索引にも含めない。
ファイル名は `NNNN-<英小文字kebab>.md`。**ファイル名は英語、`title` は日本語**。

### status は `accepted` から始める

ループでは分解と実装が同じ周で確定するので `proposed` の期間が実質存在しない。
人が `/adr` を手で叩いて先に議論を起こす場合だけ `proposed` を使う。
`status` を持つ本来の目的は `superseded` への遷移。

## 書いてはいけないこと

ADRは「なぜ」だけを持つ。次を書いたらそのADRは肥大していく。

- 実装手順・コードスニペット → `.claude/skills/`
- やることリスト → `.loop/backlog.md`
- 「結果」の節が空、または良いことしか書いていない → それは判断ではなく報告。
  受け入れたコストが書けないなら、そもそも選択が無かったということ

## 手順（新規に1件起票する）

1. 上の「ADRにするもの／しないもの」に照らして**要否を判定する**。不要なら何も作らない。
2. `docs/adr/` の既存最大番号 +1 を取る。
3. `docs/adr/_template.md` を写して `NNNN-<kebab>.md` を作り、4つの節を埋める。
4. `docs/adr/README.md` の索引テーブルに1行足す（`id` / `title` / `status` / 決定の要旨）。

## 手順（既存の判断を覆す）

**旧ADRの本文は書き換えない**（`.loop/done.md` と同じ追記のみの思想。
書き換えると「かつてそう決めた」という事実が消える）。

1. 新しいADRを起票する。「文脈」に**なぜ覆すのか**、「検討した代替案」に旧ADRの案を書く。
2. 旧ADRの frontmatter だけを `status: superseded` にし、`superseded-by: <新ID>` を足す。
3. `docs/adr/README.md` の索引で、旧行の `status` を更新し、新行を足す。
