import type { CommandResult, FileStatus, RepoState } from './types';

export function initialRepo(): RepoState {
  throw new Error('not implemented');
}

export function runCommand(_state: RepoState, _input: string): CommandResult {
  throw new Error('not implemented');
}

export function runScript(_commands: string[]): RepoState {
  throw new Error('not implemented');
}

export function fileStatus(_state: RepoState): FileStatus {
  throw new Error('not implemented');
}

export function headCommitId(_state: RepoState): string | null {
  throw new Error('not implemented');
}

// 指定コミットから親をたどって到達できるコミットID（新しい順）
export function reachableFrom(_state: RepoState, _commitId: string | null): string[] {
  throw new Error('not implemented');
}
