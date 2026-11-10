import { fileStatus, reachableFrom } from '../gitsim/gitSimulator';
import type { RepoState } from '../gitsim/types';
import type { RepoSnapshotDto } from './types';

// シミュレータの状態を判定APIに送る形へ変換する
export function toSnapshot(state: RepoState): RepoSnapshotDto {
  return {
    head: state.head.type === 'branch' ? state.head.name : null,
    branches: state.branchOrder
      .filter((name) => state.branches[name])
      .map((name) => ({ name, commits: reachableFrom(state, state.branches[name]) })),
    ...fileStatus(state),
  };
}
