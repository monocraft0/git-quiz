// gitシミュレータの状態モデル（docs/adr/0004）。
// ファイルの「中身」は持たず、編集されるたびに増える版番号だけで差分を表す。

export interface Commit {
  id: string;
  message: string;
  parents: string[];
  // そのコミット時点のファイル一覧（ファイル名 -> 版番号）
  tree: Record<string, number>;
  // 作成順。グラフの横位置に使う
  seq: number;
}

export type Head = { type: 'branch'; name: string } | { type: 'detached'; commit: string };

export interface RepoState {
  commits: Record<string, Commit>;
  // ブランチ名 -> 先端コミットID。まだコミットが無いブランチは null
  branches: Record<string, string | null>;
  // ブランチの作成順。グラフのレーン順に使う
  branchOrder: string[];
  head: Head;
  // ステージングエリア（次のコミットになるツリー）
  index: Record<string, number>;
  // 作業ディレクトリ
  workdir: Record<string, number>;
  seq: number;
  version: number;
}

export interface CommandResult {
  state: RepoState;
  output: string[];
  ok: boolean;
}

export interface FileStatus {
  staged: string[];
  modified: string[];
  untracked: string[];
}
