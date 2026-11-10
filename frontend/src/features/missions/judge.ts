import type { RepoState } from '../gitsim/types';
import type { Goal, JudgeResult, RepoSnapshot } from './types';

// コマンド列ではなく結果の状態で判定する（別解も正解になる）
export function judgeMission(_goals: Goal[], _state: RepoState): JudgeResult {
  throw new Error('not implemented');
}

export function isSatisfied(_goal: Goal, _snapshot: RepoSnapshot): boolean {
  throw new Error('not implemented');
}
