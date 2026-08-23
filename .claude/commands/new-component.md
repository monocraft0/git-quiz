---
description: フロントエンドに機能/コンポーネントを追加する（引数に機能名）
argument-hint: <feature-or-component-name>
---

`$ARGUMENTS` について、`.claude/skills/frontend-feature/SKILL.md` に従い実装する。

`.claude/skills/tdd/SKILL.md` に従い、**テストから書く**。

1. 対応するバックエンドのエンドポイントと**実際のレスポンスJSON**を確認（無ければユーザーに確認）。
2. **テストリスト**を作る（表示される内容 / 空のとき / 失敗したとき）。実装はまだ書かない。
3. `frontend/src/features/<name>/types.ts` を先に確定させ、フック/コンポーネントは
   シグネチャだけ置く（`throw new Error('not implemented')`）。
4. **赤**: RTL のテストを1件書き、`cd frontend && npx vitest run <テストファイル>` で
   落ちるのを見る（型エラーは赤に数えない）。テストと型・スタブだけをコミット
   （`test: <対象> — red (<テスト名>)`）。
5. **緑**: 最小限を実装してコミット。APIアクセスは `src/api/client.ts` 経由、
   取得はフックに隔離して loading/error/data の3状態を扱う。
6. **リファクタ**: 表示の分割・整形の純関数化。テストは変えない。リストが尽きるまで4へ。
7. `cd frontend && npm test && npm run build` を通す（スタブの残骸はここで落ちる）。

分量が大きい場合は `frontend-dev` エージェントへ委譲してよい。
