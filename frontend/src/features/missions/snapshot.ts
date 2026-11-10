import { fileStatus, reachableFrom } from '../gitsim/gitSimulator';
import type { RepoState } from '../gitsim/types';
import type { RepoSnapshot } from './types';

// シミュレータの状態を判定に使う要約へ変換する
export function toSnapshot(state: RepoState): RepoSnapshot {
  return {
    head: state.head.type === 'branch' ? state.head.name : null,
    branches: state.branchOrder
      .filter((name) => state.branches[name])
      .map((name) => ({ name, commits: reachableFrom(state, state.branches[name]) })),
    ...fileStatus(state),
  };
}
