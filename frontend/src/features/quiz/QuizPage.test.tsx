import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QuizPage } from './QuizPage';
import { api } from '../../api/client';
import type { QuizQuestionDto } from './types';

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

const questions: QuizQuestionDto[] = [
  { id: 1, question: 'Q1: git add とは？', choices: ['ステージング', 'コミット', 'プッシュ', 'マージ'] },
  { id: 2, question: 'Q2: git commit とは？', choices: ['記録', '破棄', '取得', '削除'] },
];

describe('QuizPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('マウント後、質問文と4つの選択肢ボタンが表示される', async () => {
    mockedGet.mockResolvedValueOnce(questions);
    render(<QuizPage />);

    await waitFor(() => expect(screen.getByText('Q1: git add とは？')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'ステージング' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'コミット' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'プッシュ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'マージ' })).toBeInTheDocument();
  });
});
