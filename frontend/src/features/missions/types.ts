// ミッション（問題）と判定結果の型。すべてフロントエンド内で完結する（docs/adr/0005）。

export type GoalType =
  | 'HEAD_ON' // branch にいる
  | 'BRANCH_EXISTS' // branch が存在する（コミットを指している）
  | 'STAGED' // file がステージにある
  | 'UNTRACKED' // file が未追跡
  | 'CLEAN' // ステージ・変更・未追跡がすべて空
  | 'COMMIT_COUNT' // branch から到達できるコミットが count 件
  | 'CONTAINS'; // branch が other の全コミットを含む（マージ済み）

// 判定条件。コミットIDは初期化コマンドで変わるので条件に使わない
export interface Goal {
  type: GoalType;
  description: string;
  branch?: string;
  other?: string;
  file?: string;
  count?: number;
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  // 初期状態を作るコマンド
  setupCommands: string[];
  goals: Goal[];
  // 模範解答の一例（別解でも状態が合えば正解）
  modelAnswer: string[];
  explanation: string;
}

// 判定に使うリポジトリ状態の要約
export interface RepoSnapshot {
  // いまいるブランチ名。detached HEAD のときは null
  head: string | null;
  branches: { name: string; commits: string[] }[];
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface GoalResult {
  description: string;
  passed: boolean;
}

export interface JudgeResult {
  cleared: boolean;
  goals: GoalResult[];
}
