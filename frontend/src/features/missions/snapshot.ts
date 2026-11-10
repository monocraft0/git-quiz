import type { RepoState } from '../gitsim/types';
import type { RepoSnapshotDto } from './types';

// シミュレータの状態を判定APIに送る形へ変換する
export function toSnapshot(_state: RepoState): RepoSnapshotDto {
  throw new Error('not implemented');
}
