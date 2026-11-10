// backend の com.example.app.mission の DTO に対応させる（docs/adr/0004）。

// GET /api/missions のレスポンス要素。goals は説明文だけ（判定条件は含まない）
export interface MissionDto {
  id: number;
  title: string;
  description: string;
  setupCommands: string[];
  goals: string[];
}

// POST /api/missions/{id}/judge のリクエストボディ
export interface RepoSnapshotDto {
  head: string | null;
  branches: BranchSnapshotDto[];
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface BranchSnapshotDto {
  name: string;
  commits: string[];
}

// POST /api/missions/{id}/judge のレスポンス
export interface JudgeResultDto {
  cleared: boolean;
  goals: GoalResultDto[];
  explanation: string;
  modelAnswer: string[];
}

export interface GoalResultDto {
  description: string;
  passed: boolean;
}
