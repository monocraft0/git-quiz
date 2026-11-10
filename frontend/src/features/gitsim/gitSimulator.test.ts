import { describe, expect, it } from 'vitest';
import {
  fileStatus,
  headCommitId,
  initialRepo,
  reachableFrom,
  runCommand,
  runScript,
} from './gitSimulator';
import type { RepoState } from './types';

// 成功前提でコマンドを順に流すヘルパ
function run(state: RepoState, ...commands: string[]): RepoState {
  return commands.reduce((s, cmd) => {
    const r = runCommand(s, cmd);
    if (!r.ok) throw new Error(`${cmd} failed: ${r.output.join('\n')}`);
    return r.state;
  }, state);
}

function tip(state: RepoState, branch: string) {
  const id = state.branches[branch];
  return id ? state.commits[id] : null;
}

describe('gitSimulator', () => {
  it('初期状態は main ブランチにいて、コミットもファイルも無い', () => {
    const s = initialRepo();
    expect(s.head).toEqual({ type: 'branch', name: 'main' });
    expect(Object.keys(s.commits)).toHaveLength(0);
    expect(fileStatus(s)).toEqual({ staged: [], modified: [], untracked: [] });
  });

  it('touch で作ったファイルは未追跡になる', () => {
    const s = run(initialRepo(), 'touch README.md');
    expect(fileStatus(s).untracked).toEqual(['README.md']);
  });

  it('git add <file> でステージに載る', () => {
    const s = run(initialRepo(), 'touch README.md', 'touch a.txt', 'git add README.md');
    expect(fileStatus(s)).toEqual({ staged: ['README.md'], modified: [], untracked: ['a.txt'] });
  });

  it('git add . で全ファイルがステージに載る', () => {
    const s = run(initialRepo(), 'touch a.txt', 'touch b.txt', 'git add .');
    expect(fileStatus(s).staged).toEqual(['a.txt', 'b.txt']);
  });

  it('git commit -m "..." でブランチにコミットが積まれ、状態はクリーンになる', () => {
    const s = run(
      initialRepo(),
      'touch a.txt',
      'git add .',
      'git commit -m "first commit"',
      'touch b.txt',
      'git add .',
      'git commit -m second',
    );
    const head = tip(s, 'main')!;
    expect(head.message).toBe('second');
    expect(head.parents).toHaveLength(1);
    expect(s.commits[head.parents[0]].message).toBe('first commit');
    expect(head.tree).toHaveProperty('a.txt');
    expect(head.tree).toHaveProperty('b.txt');
    expect(fileStatus(s)).toEqual({ staged: [], modified: [], untracked: [] });
  });

  it('ステージが空のコミットは失敗し、状態は変わらない', () => {
    const before = run(initialRepo(), 'touch a.txt');
    const r = runCommand(before, 'git commit -m x');
    expect(r.ok).toBe(false);
    expect(r.state).toBe(before);
  });

  it('コミット済みファイルを touch すると変更ありになる', () => {
    const s = run(initialRepo(), 'touch a.txt', 'git add .', 'git commit -m c1', 'touch a.txt');
    expect(fileStatus(s).modified).toEqual(['a.txt']);
  });

  it('git branch <name> は今のコミットにブランチを作るが、HEADは動かない', () => {
    const s = run(initialRepo(), 'touch a.txt', 'git add .', 'git commit -m c1', 'git branch feature');
    expect(s.branches.feature).toBe(s.branches.main);
    expect(s.head).toEqual({ type: 'branch', name: 'main' });
  });

  it('git switch / git switch -c / git checkout -b でHEADが移る', () => {
    const base = run(initialRepo(), 'touch a.txt', 'git add .', 'git commit -m c1');
    expect(run(base, 'git branch f', 'git switch f').head).toEqual({ type: 'branch', name: 'f' });
    expect(run(base, 'git switch -c f2').head).toEqual({ type: 'branch', name: 'f2' });
    expect(run(base, 'git checkout -b f3').head).toEqual({ type: 'branch', name: 'f3' });
  });

  it('存在しないブランチへの switch は失敗する', () => {
    const base = run(initialRepo(), 'touch a.txt', 'git add .', 'git commit -m c1');
    expect(runCommand(base, 'git switch nope').ok).toBe(false);
  });

  it('ブランチを切り替えると作業ディレクトリがそのブランチの内容になる', () => {
    const s = run(
      initialRepo(),
      'touch a.txt',
      'git add .',
      'git commit -m c1',
      'git switch -c feature',
      'touch login.html',
      'git add .',
      'git commit -m login',
      'git switch main',
    );
    expect(Object.keys(s.workdir)).toEqual(['a.txt']);
  });

  it('git merge は先祖関係なら fast-forward し、新しいコミットを作らない', () => {
    const s = run(
      initialRepo(),
      'touch a.txt',
      'git add .',
      'git commit -m c1',
      'git switch -c feature',
      'touch b.txt',
      'git add .',
      'git commit -m c2',
      'git switch main',
      'git merge feature',
    );
    expect(s.branches.main).toBe(s.branches.feature);
    expect(Object.keys(s.commits)).toHaveLength(2);
    expect(Object.keys(s.workdir).sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('git merge は分岐していれば親2つのマージコミットを作る', () => {
    const s = run(
      initialRepo(),
      'touch a.txt',
      'git add .',
      'git commit -m c1',
      'git switch -c feature',
      'touch b.txt',
      'git add .',
      'git commit -m on-feature',
      'git switch main',
      'touch c.txt',
      'git add .',
      'git commit -m on-main',
      'git merge feature',
    );
    const merge = tip(s, 'main')!;
    expect(merge.parents).toEqual([
      s.commits[merge.parents[0]].id,
      s.branches.feature,
    ]);
    expect(s.commits[merge.parents[0]].message).toBe('on-main');
    expect(Object.keys(merge.tree).sort()).toEqual(['a.txt', 'b.txt', 'c.txt']);
  });

  it('git reset --hard HEAD~1 はブランチを1つ戻し、変更も消える', () => {
    const s = run(
      initialRepo(),
      'touch a.txt',
      'git add .',
      'git commit -m c1',
      'touch b.txt',
      'git add .',
      'git commit -m c2',
      'git reset --hard HEAD~1',
    );
    expect(tip(s, 'main')!.message).toBe('c1');
    expect(Object.keys(s.workdir)).toEqual(['a.txt']);
  });

  it('git reset --soft HEAD~1 は変更をステージに残す', () => {
    const s = run(
      initialRepo(),
      'touch a.txt',
      'git add .',
      'git commit -m c1',
      'touch b.txt',
      'git add .',
      'git commit -m c2',
      'git reset --soft HEAD~1',
    );
    expect(tip(s, 'main')!.message).toBe('c1');
    expect(fileStatus(s).staged).toEqual(['b.txt']);
  });

  it('git restore --staged <file> でステージから降ろす', () => {
    const s = run(
      initialRepo(),
      'touch a.txt',
      'git add .',
      'git commit -m c1',
      'touch secret.txt',
      'git add secret.txt',
      'git restore --staged secret.txt',
    );
    expect(fileStatus(s)).toEqual({ staged: [], modified: [], untracked: ['secret.txt'] });
  });

  it('知らないコマンドは失敗し、メッセージを返す', () => {
    const r = runCommand(initialRepo(), 'git frobnicate');
    expect(r.ok).toBe(false);
    expect(r.output.join('\n')).toContain('frobnicate');
  });

  it('git log は HEAD から新しい順にコミットを出す', () => {
    const s = run(initialRepo(), 'touch a', 'git add .', 'git commit -m one', 'touch b', 'git add .', 'git commit -m two');
    const out = runCommand(s, 'git log --oneline').output;
    expect(out).toHaveLength(2);
    expect(out[0]).toContain('two');
    expect(out[1]).toContain('one');
  });

  it('runScript は同じコマンド列から同じコミットIDを作る（決定的）', () => {
    const cmds = ['touch a', 'git add .', 'git commit -m one'];
    expect(headCommitId(runScript(cmds))).toBe(headCommitId(runScript(cmds)));
    expect(headCommitId(runScript(cmds))).not.toBeNull();
  });

  it('reachableFrom は親をたどった全コミットを返す', () => {
    const s = run(initialRepo(), 'touch a', 'git add .', 'git commit -m one', 'touch b', 'git add .', 'git commit -m two');
    const ids = reachableFrom(s, headCommitId(s));
    expect(ids.map((id) => s.commits[id].message)).toEqual(['two', 'one']);
  });
});
