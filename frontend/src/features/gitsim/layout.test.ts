import { describe, expect, it } from 'vitest';
import { runScript } from './gitSimulator';
import { computeLayout } from './layout';

const byMessage = (layout: ReturnType<typeof computeLayout>, message: string) =>
  layout.nodes.find((n) => n.message === message)!;

describe('computeLayout', () => {
  it('main のコミットはレーン0に作成順で並び、親子が辺で結ばれる', () => {
    const layout = computeLayout(
      runScript(['touch a', 'git add .', 'git commit -m one', 'touch b', 'git add .', 'git commit -m two']),
    );
    expect(layout.nodes.map((n) => [n.message, n.column, n.lane])).toEqual([
      ['one', 0, 0],
      ['two', 1, 0],
    ]);
    expect(layout.edges).toEqual([{ from: byMessage(layout, 'one').id, to: byMessage(layout, 'two').id }]);
  });

  it('分岐したブランチのコミットは別レーンに置かれ、ラベルとHEADが付く', () => {
    const layout = computeLayout(
      runScript([
        'touch a',
        'git add .',
        'git commit -m one',
        'git switch -c feature',
        'touch b',
        'git add .',
        'git commit -m on-feature',
      ]),
    );
    expect(byMessage(layout, 'one').lane).toBe(0);
    expect(byMessage(layout, 'on-feature').lane).toBe(1);
    expect(layout.lanes).toBe(2);
    expect(layout.labels).toEqual([
      { branch: 'main', commit: byMessage(layout, 'one').id, isHead: false },
      { branch: 'feature', commit: byMessage(layout, 'on-feature').id, isHead: true },
    ]);
  });

  it('reset で到達できなくなったコミットは表示しない', () => {
    const layout = computeLayout(
      runScript(['touch a', 'git add .', 'git commit -m one', 'touch b', 'git add .', 'git commit -m two', 'git reset --hard HEAD~1']),
    );
    expect(layout.nodes.map((n) => n.message)).toEqual(['one']);
  });
});
