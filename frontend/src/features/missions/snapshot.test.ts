import { describe, expect, it } from 'vitest';
import { runScript } from '../gitsim/gitSimulator';
import { toSnapshot } from './snapshot';

describe('toSnapshot', () => {
  it('HEAD・各ブランチの到達可能コミット・ファイル状態を返す', () => {
    const s = runScript([
      'touch a',
      'git add .',
      'git commit -m one',
      'git switch -c feature',
      'touch b',
      'git add .',
      'git commit -m two',
      'touch c',
      'touch a',
      'git add a',
    ]);
    const snap = toSnapshot(s);
    const main = snap.branches.find((b) => b.name === 'main')!;
    const feature = snap.branches.find((b) => b.name === 'feature')!;

    expect(snap.head).toBe('feature');
    expect(main.commits).toHaveLength(1);
    expect(feature.commits).toHaveLength(2);
    expect(feature.commits).toContain(main.commits[0]);
    expect(snap.staged).toEqual(['a']);
    expect(snap.modified).toEqual([]);
    expect(snap.untracked).toEqual(['c']);
  });

  it('まだコミットの無いブランチは含めず、detached HEAD は null になる', () => {
    expect(toSnapshot(runScript(['touch a'])).branches).toEqual([]);

    const s = runScript(['touch a', 'git add .', 'git commit -m one']);
    const detached = runScript(['touch a', 'git add .', 'git commit -m one', `git checkout ${s.branches.main}`]);
    expect(toSnapshot(detached).head).toBeNull();
  });
});
