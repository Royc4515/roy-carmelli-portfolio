import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Scoreboard from './Scoreboard';
import type { RunnerScores } from '../../hooks/useRunnerScores';

function scores(over: Partial<RunnerScores> = {}): RunnerScores {
  return {
    status: 'ready',
    player: null,
    best: 0,
    leaderboard: [],
    leaderboardError: false,
    saveError: false,
    signInError: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshLeaderboard: vi.fn(),
    onRunStart: vi.fn(),
    onGameOver: vi.fn(),
    ...over,
  };
}

describe('Scoreboard', () => {
  it('is a labelled dialog that takes focus and refreshes the board on open', () => {
    const s = scores();
    render(<Scoreboard scores={s} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: /leaderboard/i });
    expect(dialog).toHaveFocus();
    expect(s.refreshLeaderboard).toHaveBeenCalledTimes(1);
  });

  it('lists the rows, marks the player and isolates RTL names', () => {
    render(
      <Scoreboard
        scores={scores({
          leaderboard: [
            { rank: 1, name: 'רועי כ.', score: 700, isMe: false },
            { rank: 2, name: 'Roy C.', score: 480, isMe: true },
          ],
        })}
        onClose={() => {}}
      />,
    );
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('1רועי כ.000700');
    expect(rows[0].querySelector('bdi')).toHaveTextContent('רועי כ.');
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
    expect(rows[1]).toHaveTextContent('(you)');
  });

  it('shows loading, empty and error states', async () => {
    const s = scores({ leaderboard: null });
    const { rerender } = render(<Scoreboard scores={s} onClose={() => {}} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    rerender(<Scoreboard scores={{ ...s, leaderboard: [] }} onClose={() => {}} />);
    expect(screen.getByText(/no scores yet/i)).toBeInTheDocument();
    rerender(<Scoreboard scores={{ ...s, leaderboardError: true }} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(s.refreshLeaderboard).toHaveBeenCalledTimes(2);
  });

  it('signed out: offers Google sign-in', async () => {
    const s = scores();
    render(<Scoreboard scores={s} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(s.signIn).toHaveBeenCalled();
  });

  it('signed in: shows the name and best, and signs out', async () => {
    const s = scores({ player: { firstName: 'Roy' }, best: 250 });
    render(<Scoreboard scores={s} onClose={() => {}} />);
    expect(screen.getByText(/signed in as/i)).toHaveTextContent('Signed in as Roy. Your best: 000250');
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(s.signOut).toHaveBeenCalled();
  });

  it('reports a run that was not saved', () => {
    render(<Scoreboard scores={scores({ saveError: true })} onClose={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/wasn't saved/i);
  });

  it('a click on the backdrop closes it; a click on the panel does not', async () => {
    const onClose = vi.fn();
    const { container } = render(<Scoreboard scores={scores()} onClose={onClose} />);
    await userEvent.click(screen.getByText(/sign in to save/i));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(container.querySelector('.scoreboard')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc closes it, and no key inside reaches the game listening on window', () => {
    const onClose = vi.fn();
    const onWindowKey = vi.fn();
    window.addEventListener('keydown', onWindowKey);
    render(<Scoreboard scores={scores()} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: ' ', code: 'Space' });
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    window.removeEventListener('keydown', onWindowKey);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onWindowKey).not.toHaveBeenCalled();
  });
});
