import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { MissionPage } from './MissionPage';
import type { JudgeResultDto, MissionDto } from './types';

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

const missions: MissionDto[] = [
  {
    id: 1,
    title: 'ファイルをステージに載せよう',
    description: 'README.md をステージに載せましょう。',
    setupCommands: ['touch README.md'],
    goals: ['README.md がステージにある'],
  },
  {
    id: 2,
    title: 'ブランチを作ろう',
    description: 'feature ブランチを作りましょう。',
    setupCommands: ['touch README.md', 'git add .', 'git commit -m "first commit"'],
    goals: ['feature ブランチがある'],
  },
];

const cleared: JudgeResultDto = {
  cleared: true,
  goals: [{ description: 'README.md がステージにある', passed: true }],
  explanation: 'git add はステージに載せます。',
  modelAnswer: ['git add README.md'],
};

const notCleared: JudgeResultDto = {
  cleared: false,
  goals: [{ description: 'README.md がステージにある', passed: false }],
  explanation: 'git add はステージに載せます。',
  modelAnswer: ['git add README.md'],
};

async function renderLoaded() {
  const user = userEvent.setup();
  mockedGet.mockResolvedValueOnce(missions);
  render(<MissionPage />);
  await waitFor(() => expect(screen.getByText('ファイルをステージに載せよう')).toBeInTheDocument());
  return user;
}

const type = (user: ReturnType<typeof userEvent.setup>, command: string) =>
  user.type(screen.getByLabelText('コマンド入力'), `${command}{Enter}`);

const area = (name: string) => screen.getByRole('region', { name });

describe('MissionPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('マウント後、ミッションの説明と目標が表示され、初期状態が図に描かれる', async () => {
    await renderLoaded();

    expect(mockedGet).toHaveBeenCalledWith('/api/missions');
    expect(screen.getByText('README.md をステージに載せましょう。')).toBeInTheDocument();
    expect(screen.getByText('README.md がステージにある')).toBeInTheDocument();
    expect(within(area('作業ディレクトリ')).getByText('README.md')).toBeInTheDocument();
    expect(within(area('ステージングエリア')).queryByText('README.md')).not.toBeInTheDocument();
  });

  it('git add を打つと、ターミナルに表示され、ファイルがステージングエリアへ移る', async () => {
    const user = await renderLoaded();

    await type(user, 'git add README.md');

    expect(screen.getByText('$ git add README.md')).toBeInTheDocument();
    expect(within(area('ステージングエリア')).getByText('README.md')).toBeInTheDocument();
  });

  it('git commit を打つと、コミットグラフにコミットが増える', async () => {
    const user = await renderLoaded();
    const graph = screen.getByRole('img', { name: 'コミットグラフ' });
    expect(within(graph).queryAllByLabelText(/^コミット /)).toHaveLength(0);

    await type(user, 'git add .');
    await type(user, 'git commit -m "first commit"');

    expect(within(graph).getAllByLabelText(/^コミット .* first commit$/)).toHaveLength(1);
    expect(within(graph).getByLabelText('ブランチ main（HEAD）')).toBeInTheDocument();
  });

  it('知らないコマンドはターミナルにエラーとして表示され、状態は変わらない', async () => {
    const user = await renderLoaded();

    await type(user, 'git frobnicate');

    expect(screen.getByText(/frobnicate/, { selector: '[data-kind="error"]' })).toBeInTheDocument();
    expect(within(area('作業ディレクトリ')).getByText('README.md')).toBeInTheDocument();
  });

  it('答え合わせでリポジトリの状態を送り、クリア時は解説が出る', async () => {
    const user = await renderLoaded();
    mockedPost.mockResolvedValueOnce(cleared);

    await type(user, 'git add README.md');
    await user.click(screen.getByRole('button', { name: '答え合わせ' }));

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/api/missions/1/judge', {
        head: 'main',
        branches: [],
        staged: ['README.md'],
        modified: [],
        untracked: [],
      }),
    );
    expect(await screen.findByText('クリア！')).toBeInTheDocument();
    expect(screen.getByText('git add はステージに載せます。')).toBeInTheDocument();
  });

  it('未クリア時は達成していない目標が分かり、「答えを見る」で模範解答が出る', async () => {
    const user = await renderLoaded();
    mockedPost.mockResolvedValueOnce(notCleared);

    await user.click(screen.getByRole('button', { name: '答え合わせ' }));

    expect(await screen.findByText('まだクリアしていません')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: '未達成: README.md がステージにある' })).toBeInTheDocument();
    expect(screen.queryByText('git add README.md')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '答えを見る' }));
    expect(screen.getByText('git add README.md')).toBeInTheDocument();
  });

  it('リセットするとミッションの初期状態に戻る', async () => {
    const user = await renderLoaded();
    await type(user, 'git add README.md');
    expect(within(area('ステージングエリア')).getByText('README.md')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'リセット' }));

    expect(within(area('ステージングエリア')).queryByText('README.md')).not.toBeInTheDocument();
    expect(screen.queryByText('$ git add README.md')).not.toBeInTheDocument();
  });

  it('次のミッションへ進み、最後まで行くとクリア数のサマリーが出る', async () => {
    const user = await renderLoaded();
    mockedPost.mockResolvedValueOnce(cleared).mockResolvedValueOnce({ ...notCleared, goals: [] });

    await user.click(screen.getByRole('button', { name: '答え合わせ' }));
    await user.click(await screen.findByRole('button', { name: '次のミッションへ' }));

    expect(await screen.findByText('ブランチを作ろう')).toBeInTheDocument();
    // 2問目の初期状態（コミット1つ）が図に反映されている
    expect(within(screen.getByRole('img', { name: 'コミットグラフ' })).getAllByLabelText(/^コミット /)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '答え合わせ' }));
    await user.click(await screen.findByRole('button', { name: '次のミッションへ' }));

    expect(await screen.findByText('2問中1問クリア')).toBeInTheDocument();
    expect(screen.queryByLabelText('コマンド入力')).not.toBeInTheDocument();
  });

  it('失敗系: ミッションの取得に失敗したらエラーを表示する', async () => {
    mockedGet.mockRejectedValueOnce(new Error('boom'));
    render(<MissionPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('boom'));
  });
});
