import { describe, expect, it } from 'vitest';
import { runScript } from '../gitsim/gitSimulator';
import { isSatisfied, judgeMission } from './judge';
import type { Goal, RepoSnapshot } from './types';

const snap = (over: Partial<RepoSnapshot> = {}): RepoSnapshot => ({
  head: 'main',
  branches: [{ name: 'main', commits: ['c1'] }],
  staged: [],
  modified: [],
  untracked: [],
  ...over,
});

const branches = (map: Record<string, string[]>) =>
  Object.entries(map).map(([name, commits]) => ({ name, commits }));

const goal = (g: Omit<Goal, 'description'>): Goal => ({ description: 'd', ...g });

describe('isSatisfied', () => {
  it('HEAD_ON は HEAD がそのブランチのときだけ満たす', () => {
    const g = goal({ type: 'HEAD_ON', branch: 'feature' });
    expect(isSatisfied(g, snap({ head: 'feature' }))).toBe(true);
    expect(isSatisfied(g, snap({ head: 'main' }))).toBe(false);
    expect(isSatisfied(g, snap({ head: null }))).toBe(false);
  });

  it('BRANCH_EXISTS はブランチがあるときだけ満たす', () => {
    const g = goal({ type: 'BRANCH_EXISTS', branch: 'feature' });
    expect(isSatisfied(g, snap({ branches: branches({ main: ['c1'], feature: ['c1'] }) }))).toBe(true);
    expect(isSatisfied(g, snap())).toBe(false);
  });

  it('STAGED / UNTRACKED はファイルの置き場所を見る', () => {
    const staged = goal({ type: 'STAGED', file: 'a.txt' });
    const untracked = goal({ type: 'UNTRACKED', file: 'a.txt' });
    expect(isSatisfied(staged, snap({ staged: ['a.txt'] }))).toBe(true);
    expect(isSatisfied(staged, snap({ untracked: ['a.txt'] }))).toBe(false);
    expect(isSatisfied(untracked, snap({ untracked: ['a.txt'] }))).toBe(true);
    expect(isSatisfied(untracked, snap({ staged: ['a.txt'] }))).toBe(false);
  });

  it('CLEAN はステージ・変更・未追跡のどれかがあれば満たさない', () => {
    const g = goal({ type: 'CLEAN' });
    expect(isSatisfied(g, snap())).toBe(true);
    expect(isSatisfied(g, snap({ staged: ['a'] }))).toBe(false);
    expect(isSatisfied(g, snap({ modified: ['a'] }))).toBe(false);
    expect(isSatisfied(g, snap({ untracked: ['a'] }))).toBe(false);
  });

  it('COMMIT_COUNT は到達できるコミット数を比べる', () => {
    const g = goal({ type: 'COMMIT_COUNT', branch: 'main', count: 2 });
    expect(isSatisfied(g, snap({ branches: branches({ main: ['c2', 'c1'] }) }))).toBe(true);
    expect(isSatisfied(g, snap({ branches: branches({ main: ['c1'] }) }))).toBe(false);
    expect(isSatisfied(g, snap({ branches: [] }))).toBe(false);
  });

  it('CONTAINS は other の全コミットを branch が含むときだけ満たす', () => {
    const g = goal({ type: 'CONTAINS', branch: 'main', other: 'feature' });
    expect(isSatisfied(g, snap({ branches: branches({ main: ['m', 'f1', 'c1'], feature: ['f1', 'c1'] }) }))).toBe(true);
    expect(isSatisfied(g, snap({ branches: branches({ main: ['c1'], feature: ['f1', 'c1'] }) }))).toBe(false);
    expect(isSatisfied(g, snap({ branches: branches({ main: ['c1'] }) }))).toBe(false);
  });
});

describe('judgeMission', () => {
  it('目標ごとの結果を返し、すべて満たしたときだけクリアになる', () => {
    const goals: Goal[] = [
      { type: 'HEAD_ON', branch: 'main', description: 'main にいる' },
      { type: 'CLEAN', description: 'クリーン' },
    ];
    const dirty = runScript(['touch a.txt', 'git add a.txt']);

    const r = judgeMission(goals, dirty);
    expect(r.cleared).toBe(false);
    expect(r.goals).toEqual([
      { description: 'main にいる', passed: true },
      { description: 'クリーン', passed: false },
    ]);

    expect(judgeMission(goals, runScript(['touch a.txt', 'git add a.txt', 'git commit -m one'])).cleared).toBe(true);
  });
});
