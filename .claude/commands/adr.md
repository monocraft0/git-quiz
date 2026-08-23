---
description: 設計判断をADRとして docs/adr/ に1件起票する（引数に決定の要旨）
argument-hint: <decision-title> [--supersede=NNNN]
---

`$ARGUMENTS` の設計判断を、`.claude/skills/adr/SKILL.md` に従って `docs/adr/` に起票する。

## 手順

1. **要否を判定** — SKILL.md の「ADRにするもの／しないもの」に照らす。
   該当しなければ**何も作らず**、なぜ不要かを1行で報告して終了する。
2. **重複を確認** — `docs/adr/README.md` の索引を読み、同じ主題のADRが既に無いか見る。
   あれば新規ではなく `--supersede` の経路（手順5）。
3. **採番** — Glob（`docs/adr/[0-9]*.md`）で既存の最大番号を取り、+1。`_template.md` は数えない。
   （`ls` を Bash で叩かない。許可リストに無く承認待ちで止まる）
4. **起票** — `docs/adr/_template.md` を写して `NNNN-<英小文字kebab>.md` を作る。
   - `title` は日本語、ファイル名は英語kebab。`date` は `date +%F`。
   - `status` は既定 `accepted`。**まだ決めきらず先に議論を起こしたい場合だけ `proposed`**
     にし、その旨を報告する（`proposed` のまま放置されたADRは誰も回収しない）。
   - 「文脈」に決定を書かない。「結果」の**悪くなること**を必ず埋める。
     ここが空なら判断ではなく報告なので、書き直す。
   - 引数だけでは文脈・代替案が埋まらない場合は、埋まらない箇所を**人に聞く**。
     推測で埋めない（残す価値があるのは理由であって、もっともらしい文章ではない）。
5. **`--supersede=NNNN` 指定時** — 旧ADRの**本文は書き換えない**。frontmatter だけを
   `status: superseded` にし `superseded-by: <新ID>` を足す。
6. **索引を更新** — `docs/adr/README.md` のテーブルに1行足す（supersede時は旧行の
   `status` も更新）。

## 報告

- 作成したファイルのパスと `id`
- 決定の1行要約
- supersede した場合は、覆した旧ADR
- 起票しなかった場合は、その理由
