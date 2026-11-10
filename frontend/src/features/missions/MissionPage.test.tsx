import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MissionPage } from './MissionPage';
import type { Mission } from './types';

const missions: Mission[] = [
  {
    id: 1,
    title: 'ファイルをステージに載せよう',
    description: 'README.md をステージに載せましょう。',
    setupCommands: ['touch README.md'],
    goals: [{ type: 'STAGED', file: 'README.md', description: 'README.md がステージにある' }],
    modelAnswer: ['git add README.md'],
    explanation: 'git add はステージに載せます。',
  },
  {
    id: 2,
    title: 'ブランチを作ろう',
    description: 'feature ブランチを作りましょう。',
    setupCommands: ['touch README.md', 'git add .', 'git commit -m "first commit"'],
    goals: [{ type: 'BRANCH_EXISTS', branch: 'feature', description: 'feature ブランチがある' }],
    modelAnswer: ['git branch feature'],
    explanation: 'git branch は名札を作ります。',
  },
];

function renderPage() {
  const user = userEvent.setup();
  render(<MissionPage missions={missions} />);
  return user;
}

const type = (user: ReturnType<typeof userEvent.setup>, command: string) =>
  user.type(screen.getByLabelText('コマンド入力'), `${command}{Enter}`);

const area = (name: string) => screen.getByRole('region', { name });
const graph = () => screen.getByRole('img', { name: 'コミットグラフ' });

describe('MissionPage', () => {
  it('最初のミッションの説明と目標が表示され、初期状態が図に描かれる', () => {
    renderPage();

    expect(screen.getByText('ファイルをステージに載せよう')).toBeInTheDocument();
    expect(screen.getByText('README.md をステージに載せましょう。')).toBeInTheDocument();
    expect(screen.getByText('README.md がステージにある')).toBeInTheDocument();
    expect(within(area('作業ディレクトリ')).getByText('README.md')).toBeInTheDocument();
    expect(within(area('ステージングエリア')).queryByText('README.md')).not.toBeInTheDocument();
  });

  it('git add を打つと、ターミナルに表示され、ファイルがステージングエリアへ移る', async () => {
    const user = renderPage();

    await type(user, 'git add README.md');

    expect(screen.getByText('$ git add README.md')).toBeInTheDocument();
    expect(within(area('ステージングエリア')).getByText('README.md')).toBeInTheDocument();
  });

  it('git commit を打つと、コミットグラフにコミットが増える', async () => {
    const user = renderPage();
    expect(within(graph()).queryAllByLabelText(/^コミット /)).toHaveLength(0);

    await type(user, 'git add .');
    await type(user, 'git commit -m "first commit"');

    expect(within(graph()).getAllByLabelText(/^コミット .* first commit$/)).toHaveLength(1);
    expect(within(graph()).getByLabelText('ブランチ main（HEAD）')).toBeInTheDocument();
  });

  it('知らないコマンドはターミナルにエラーとして表示され、状態は変わらない', async () => {
    const user = renderPage();

    await type(user, 'git frobnicate');

    expect(screen.getByText(/frobnicate/, { selector: '[data-kind="error"]' })).toBeInTheDocument();
    expect(within(area('作業ディレクトリ')).getByText('README.md')).toBeInTheDocument();
  });

  it('目標の状態を作って答え合わせするとクリアになり、解説と模範解答が出る', async () => {
    const user = renderPage();

    await type(user, 'git add README.md');
    await user.click(screen.getByRole('button', { name: '答え合わせ' }));

    expect(screen.getByText('クリア！')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: '達成: README.md がステージにある' })).toBeInTheDocument();
    expect(screen.getByText('git add はステージに載せます。')).toBeInTheDocument();
    expect(screen.getByText('git add README.md')).toBeInTheDocument();
  });

  it('未クリア時は達成していない目標が分かり、「答えを見る」で模範解答が出る', async () => {
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: '答え合わせ' }));

    expect(screen.getByText('まだクリアしていません')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: '未達成: README.md がステージにある' })).toBeInTheDocument();
    expect(screen.queryByText('git add README.md')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '答えを見る' }));
    expect(screen.getByText('git add README.md')).toBeInTheDocument();
  });

  it('リセットするとミッションの初期状態に戻る', async () => {
    const user = renderPage();
    await type(user, 'git add README.md');
    expect(within(area('ステージングエリア')).getByText('README.md')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'リセット' }));

    expect(within(area('ステージングエリア')).queryByText('README.md')).not.toBeInTheDocument();
    expect(screen.queryByText('$ git add README.md')).not.toBeInTheDocument();
  });

  it('次のミッションへ進み、最後まで行くとクリア数のサマリーが出る', async () => {
    const user = renderPage();

    await type(user, 'git add README.md');
    await user.click(screen.getByRole('button', { name: '答え合わせ' }));
    await user.click(screen.getByRole('button', { name: '次のミッションへ' }));

    expect(screen.getByText('ブランチを作ろう')).toBeInTheDocument();
    expect(within(graph()).getAllByLabelText(/^コミット /)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '答え合わせ' }));
    await user.click(screen.getByRole('button', { name: '次のミッションへ' }));

    expect(screen.getByText('2問中1問クリア')).toBeInTheDocument();
    expect(screen.queryByLabelText('コマンド入力')).not.toBeInTheDocument();
  });

  it('同じミッションを何度クリアしてもクリア数は1つだけ増える', async () => {
    const user = renderPage();

    await type(user, 'git add README.md');
    await user.click(screen.getByRole('button', { name: '答え合わせ' }));
    await user.click(screen.getByRole('button', { name: '答え合わせ' }));
    await user.click(screen.getByRole('button', { name: '次のミッションへ' }));
    await user.click(screen.getByRole('button', { name: '次のミッションへ' }));

    expect(screen.getByText('2問中1問クリア')).toBeInTheDocument();
  });
});
