import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QuizPage } from './QuizPage';
import { api } from '../../api/client';
import type { QuizQuestionDto, AnswerResultDto } from './types';

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

  it('選択肢をクリックすると解答を送信し、正解時は正解表示と解説が表示される', async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValueOnce(questions);
    const answerResult: AnswerResultDto = {
      correct: true,
      correctIndex: 0,
      explanation: 'git add はステージングに追加します。',
    };
    mockedPost.mockResolvedValueOnce(answerResult);

    render(<QuizPage />);
    await waitFor(() => expect(screen.getByText('Q1: git add とは？')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'ステージング' }));

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/api/quiz/questions/1/answer', { selectedIndex: 0 }),
    );
    await waitFor(() => expect(screen.getByText('正解')).toBeInTheDocument());
    expect(screen.getByText('git add はステージングに追加します。')).toBeInTheDocument();
  });

  it('不正解時は不正解表示と解説が表示される', async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValueOnce(questions);
    const answerResult: AnswerResultDto = {
      correct: false,
      correctIndex: 0,
      explanation: 'git add はステージングに追加します。',
    };
    mockedPost.mockResolvedValueOnce(answerResult);

    render(<QuizPage />);
    await waitFor(() => expect(screen.getByText('Q1: git add とは？')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'コミット' }));

    await waitFor(() => expect(screen.getByText('不正解')).toBeInTheDocument());
    expect(screen.getByText('git add はステージングに追加します。')).toBeInTheDocument();
  });

  it('「次の問題へ」ボタンをクリックすると次の質問文が表示される', async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValueOnce(questions);
    const answerResult: AnswerResultDto = {
      correct: true,
      correctIndex: 0,
      explanation: 'git add はステージングに追加します。',
    };
    mockedPost.mockResolvedValueOnce(answerResult);

    render(<QuizPage />);
    await waitFor(() => expect(screen.getByText('Q1: git add とは？')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'ステージング' }));
    await waitFor(() => expect(screen.getByText('正解')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '次の問題へ' }));

    await waitFor(() => expect(screen.getByText('Q2: git commit とは？')).toBeInTheDocument());
  });

  it('最後の問題に回答して次へ進むと、最終スコアのサマリーが表示され質問や選択肢は表示されなくなる', async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValueOnce(questions);
    const correctResult: AnswerResultDto = {
      correct: true,
      correctIndex: 0,
      explanation: 'git add はステージングに追加します。',
    };
    const incorrectResult: AnswerResultDto = {
      correct: false,
      correctIndex: 0,
      explanation: 'git commit は変更を記録します。',
    };
    mockedPost.mockResolvedValueOnce(correctResult).mockResolvedValueOnce(incorrectResult);

    render(<QuizPage />);
    await waitFor(() => expect(screen.getByText('Q1: git add とは？')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'ステージング' }));
    await waitFor(() => expect(screen.getByText('正解')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '次の問題へ' }));

    await waitFor(() => expect(screen.getByText('Q2: git commit とは？')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '記録' }));
    await waitFor(() => expect(screen.getByText('不正解')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '次の問題へ' }));

    await waitFor(() => expect(screen.getByText('2問中1問正解')).toBeInTheDocument());
    expect(screen.queryByText('Q1: git add とは？')).not.toBeInTheDocument();
    expect(screen.queryByText('Q2: git commit とは？')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '次の問題へ' })).not.toBeInTheDocument();
  });

  it('失敗系: api.get が reject したときエラーメッセージが表示される', async () => {
    mockedGet.mockRejectedValueOnce(new Error('boom'));
    render(<QuizPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('boom'));
  });
});
