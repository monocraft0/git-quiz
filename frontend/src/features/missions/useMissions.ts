import type { RepoState } from '../gitsim/types';
import type { JudgeResultDto, MissionDto } from './types';

export interface TerminalLine {
  kind: 'input' | 'output' | 'error';
  text: string;
}

export interface MissionsState {
  loading: boolean;
  error: string | null;
  mission: MissionDto | null;
  missionIndex: number;
  total: number;
  repo: RepoState;
  history: TerminalLine[];
  result: JudgeResultDto | null;
  clearedCount: number;
  finished: boolean;
  run: (command: string) => void;
  judge: () => void;
  reset: () => void;
  next: () => void;
}

export function useMissions(): MissionsState {
  throw new Error('not implemented');
}
