import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HealthPage } from './HealthPage';
import { api } from '../../api/client';
import type { HealthResponse } from './types';

vi.mock('../../api/client', () => ({
  api: { get: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);

describe('HealthPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('APIの結果を表示する', async () => {
    mockedGet.mockResolvedValueOnce({ status: 'UP', service: 'app' } satisfies HealthResponse);
    render(<HealthPage />);
    await waitFor(() => expect(screen.getByText(/UP/)).toBeInTheDocument());
  });

  it('失敗時にエラーを表示する', async () => {
    mockedGet.mockRejectedValueOnce(new Error('boom'));
    render(<HealthPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('boom'));
  });
});
