import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { initialRepo, runCommand, runScript } from '../gitsim/gitSimulator';
import type { RepoState } from '../gitsim/types';
import { toSnapshot } from './snapshot';
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

// ミッションの取得・シミュレータの状態・判定APIの呼び出しをまとめて持つ。
// gitの挙動はブラウザ内で完結させ、判定だけサーバーに問い合わせる（docs/adr/0004）。
export function useMissions(): MissionsState {
  const [missions, setMissions] = useState<MissionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missionIndex, setMissionIndex] = useState(0);
  const [repo, setRepo] = useState<RepoState>(initialRepo);
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [result, setResult] = useState<JudgeResultDto | null>(null);
  const [clearedIds, setClearedIds] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);

  const mission = missions[missionIndex] ?? null;

  const startMission = useCallback((m: MissionDto | undefined) => {
    setHistory([]);
    setResult(null);
    if (!m) return;
    try {
      setRepo(runScript(m.setupCommands));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .get<MissionDto[]>('/api/missions')
      .then((res) => {
        if (!alive) return;
        setMissions(res);
        startMission(res[0]);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'unknown error'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [startMission]);

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
    api
      .post<JudgeResultDto>(`/api/missions/${mission.id}/judge`, toSnapshot(repo))
      .then((res) => {
        setResult(res);
        if (res.cleared) setClearedIds((ids) => new Set(ids).add(mission.id));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'unknown error'));
  };

  const reset = () => startMission(mission ?? undefined);

  const next = () => {
    if (missionIndex + 1 >= missions.length) {
      setFinished(true);
      return;
    }
    setMissionIndex(missionIndex + 1);
    startMission(missions[missionIndex + 1]);
  };

  return {
    loading,
    error,
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
    reset,
    next,
  };
}
