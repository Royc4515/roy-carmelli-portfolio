import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RunnerScores } from '../../hooks/useRunnerScores';

const state = vi.hoisted(() => ({ status: 'ready' as RunnerScores['status'] }));
vi.mock('../../hooks/useRunnerScores', () => ({
  useRunnerScores: (): RunnerScores => ({
    status: state.status,
    player: null,
    best: 0,
    leaderboard: [],
    leaderboardError: false,
    saveError: false,
    signInError: false,
    signIn: () => {},
    signOut: () => {},
    refreshLeaderboard: () => {},
    onRunStart: () => {},
    onGameOver: () => {},
  }),
}));

import MiniGame, { SCOREBOARD_EVENT } from './MiniGame';

beforeEach(() => {
  state.status = 'ready';
});

describe('MiniGame scoreboard', () => {
  it('touch: the trophy opens the leaderboard, and closing it returns focus to the trophy', async () => {
    const user = userEvent.setup();
    render(<MiniGame showTouchControls />);
    const trophy = screen.getByRole('button', { name: 'Leaderboard' });
    await user.click(trophy);
    expect(screen.getByRole('dialog', { name: /leaderboard/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close leaderboard/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trophy).toHaveFocus();
  });

  it('desktop: opens on the runner:scores event (Hero\'s Leaderboard button)', () => {
    render(<MiniGame />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      window.dispatchEvent(new CustomEvent(SCOREBOARD_EVENT));
    });
    expect(screen.getByRole('dialog', { name: /leaderboard/i })).toBeInTheDocument();
  });

  it('with no backend configured: no trophy, and the event does nothing', () => {
    state.status = 'offline';
    render(<MiniGame showTouchControls />);
    expect(screen.queryByRole('button', { name: 'Leaderboard' })).toBeNull();
    act(() => {
      window.dispatchEvent(new CustomEvent(SCOREBOARD_EVENT));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
