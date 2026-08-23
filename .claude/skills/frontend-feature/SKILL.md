---
name: frontend-feature
description: Conventions and recipe for adding a feature to the React + Vite + TypeScript frontend — feature-folder layout, typed API client usage, data-fetching hooks, and Vitest + React Testing Library tests. Use when adding or modifying frontend UI or client-side data access.
---

# フロントエンド 機能追加

## 機能フォルダ構成（package-by-feature）

機能 `foo` は `frontend/src/features/foo/` にまとめる：

```
features/foo/
├── FooPage.tsx        # 画面（ルーティングの単位）
├── FooList.tsx        # 表示コンポーネント
├── useFoo.ts          # データ取得フック（APIクライアント利用）
├── types.ts           # バックのDTOに対応する型
└── FooPage.test.tsx   # Vitest + RTL
```

## 規約

1. **型はバックのDTOに一致させる**。`types.ts` にResponse/Requestを定義し、エンドポイント変更時に必ず同期。
2. **APIアクセスは `src/api/client.ts` 経由**。`fetch` を各所で直書きしない。ベースURLは `import.meta.env.VITE_API_BASE_URL`。
3. **データ取得はフックに隔離**（`useFoo.ts`）。コンポーネントは表示に集中。loading / error / data の3状態を必ず扱う。
4. **コンポーネントは関数コンポーネント + Hooks**。props型を明示。
5. **表示とロジックを分離**: 取得ロジックはフック、整形は純関数、JSXは薄く。
6. **テストが先**: ユーザー視点でRTL（`getByRole`/`getByText`）。APIはモック（`vi.mock` or MSW）。
   **コンポーネントより先に書き、赤を見てから**実装する（`.claude/skills/tdd/SKILL.md`）。

## APIクライアントの使い方

```ts
import { api } from '../../api/client';
import type { FooResponse } from './types';

const foos = await api.get<FooResponse[]>('/api/foos');
await api.post<FooResponse>('/api/foos', { name: 'bar' });
```

## データ取得フックの型

```ts
export function useFoos() {
  const [data, setData] = useState<FooResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // useEffect で api.get、finally で loading=false、catch で error
  return { data, loading, error };
}
```

## 手順（赤 → 緑 → リファクタ）

**コンポーネントから書き始めない。** テストリストの1件ごとに2〜4を回す。

1. **型を先に確定させる** — `types.ts` をバックの**実際のレスポンスJSON**に1:1で対応させる。
   テストが組み立てるモックの形がここで決まるので、赤より先に置く。推測で書かない。

2. **赤** — `FooPage.test.tsx` にテストを1件書き、落ちるのを見る。
   呼び先が無ければシグネチャだけ置く（`throw new Error('not implemented')`）。

   ```bash
   cd frontend && npx vitest run src/features/foo/FooPage.test.tsx
   ```

   落ちた理由が assertion か `not implemented` であることを確認する。
   **型エラー・import 解決失敗は赤に数えない。** 緑になったらそのテストは
   コンポーネントを経由していない。確認できたらテストと型・スタブだけをコミットする
   （`test: <対象> — red (<テスト名>)`）。

3. **緑** — 赤を消す最小限を実装する。取得は `useFoo.ts` に隔離し、loading / error / data の
   3状態を扱う。`npm test` で緑を確認してコミットする。

4. **リファクタ** — 表示コンポーネントの分割、整形の純関数化、`FooPage.tsx` の整理。
   **テストは変えない**。ルーティングを使っていれば `FooPage` を登録する。

5. 最後に `npm test && npm run build`（`tsc -b` を含む）を通す。
   未使用の import や**スタブの残骸**はここで落ちる。
