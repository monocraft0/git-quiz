import type { RepoState } from '../gitsim/types';
import { toSnapshot } from './snapshot';
import type { Goal, JudgeResult, RepoSnapshot } from './types';

// コマンド列ではなく結果の状態で判定する（別解も正解になる）
export function judgeMission(goals: Goal[], state: RepoState): JudgeResult {
  const snapshot = toSnapshot(state);
  const results = goals.map((g) => ({ description: g.description, passed: isSatisfied(g, snapshot) }));
  return { cleared: results.every((r) => r.passed), goals: results };
}

export function isSatisfied(goal: Goal, s: RepoSnapshot): boolean {
  const commitsOf = new Map(s.branches.map((b) => [b.name, b.commits]));
  switch (goal.type) {
    case 'HEAD_ON':
      return s.head === goal.branch;
    case 'BRANCH_EXISTS':
      return commitsOf.has(goal.branch ?? '');
    case 'STAGED':
      return s.staged.includes(goal.file ?? '');
    case 'UNTRACKED':
      return s.untracked.includes(goal.file ?? '');
    case 'CLEAN':
      return s.staged.length === 0 && s.modified.length === 0 && s.untracked.length === 0;
    case 'COMMIT_COUNT':
      return commitsOf.get(goal.branch ?? '')?.length === goal.count;
    case 'CONTAINS': {
      const mine = commitsOf.get(goal.branch ?? '');
      const theirs = commitsOf.get(goal.other ?? '');
      return !!mine && !!theirs && theirs.every((id) => mine.includes(id));
    }
  }
}
