import { useState } from 'react';
import { runCommand, runScript } from '../gitsim/gitSimulator';
import type { RepoState } from '../gitsim/types';
import { judgeMission } from './judge';
import type { JudgeResult, Mission } from './types';

export interface TerminalLine {
  kind: 'input' | 'output' | 'error';
  text: string;
}

export interface MissionsState {
  mission: Mission | null;
  missionIndex: number;
  total: number;
  repo: RepoState;
  history: TerminalLine[];
  result: JudgeResult | null;
  clearedCount: number;
  finished: boolean;
  run: (command: string) => void;
  judge: () => void;
  reset: () => void;
  next: () => void;
  restart: () => void;
}

// 出題の進行・シミュレータの状態・判定をまとめて持つ。すべてブラウザ内で完結する（docs/adr/0005）。
export function useMissions(missions: Mission[]): MissionsState {
  const [missionIndex, setMissionIndex] = useState(0);
  const [repo, setRepo] = useState<RepoState>(() => runScript(missions[0]?.setupCommands ?? []));
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [clearedIds, setClearedIds] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);

  const mission = missions[missionIndex] ?? null;

  const start = (index: number) => {
    setMissionIndex(index);
    setRepo(runScript(missions[index]?.setupCommands ?? []));
    setHistory([]);
    setResult(null);
  };

  const run = (command: string) => {
    if (command.trim() === 'clear') {
      setHistory([]);
      return;
    }
    const r = runCommand(repo, command);
    setRepo(r.state);
    setHistory((h) => [
      ...h,
      { kind: 'input', text: command },
      ...r.output.map((text): TerminalLine => ({ kind: r.ok ? 'output' : 'error', text })),
    ]);
  };

  const judge = () => {
    if (!mission) return;
    const r = judgeMission(mission.goals, repo);
    setResult(r);
    if (r.cleared) setClearedIds((ids) => new Set(ids).add(mission.id));
  };

  const next = () => {
    if (missionIndex + 1 >= missions.length) {
      setFinished(true);
      return;
    }
    start(missionIndex + 1);
  };

  const restart = () => {
    setClearedIds(new Set());
    setFinished(false);
    start(0);
  };

  return {
    mission,
    missionIndex,
    total: missions.length,
    repo,
    history,
    result,
    clearedCount: clearedIds.size,
    finished,
    run,
    judge,
    reset: () => start(missionIndex),
    next,
    restart,
  };
}
