import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase } from '../test/fakeSupabase';
import { LOCAL_BEST_KEY } from '../lib/runnerScores';

const getSupabase = vi.hoisted(() => vi.fn());
vi.mock('../lib/supabase', () => ({ getSupabase }));

import { useRunnerScores } from './useRunnerScores';

const roy = { user_metadata: { full_name: 'Roy Carmelli' } };

beforeEach(() => {
  window.localStorage.clear();
  getSupabase.mockReset();
});

describe('useRunnerScores', () => {
  it('without a backend: offline, best kept on this device', async () => {
    getSupabase.mockResolvedValue(null);
    window.localStorage.setItem(LOCAL_BEST_KEY, '40');
    const { result } = renderHook(() => useRunnerScores());
    await waitFor(() => expect(result.current.status).toBe('offline'));
    expect(result.current.best).toBe(40);

    act(() => {
      result.current.onRunStart();
      result.current.onGameOver(95);
    });
    expect(result.current.best).toBe(95);
    expect(window.localStorage.getItem(LOCAL_BEST_KEY)).toBe('95');
  });

  it('signed out: never opens or submits a run on the server', async () => {
    const fake = fakeSupabase();
    getSupabase.mockResolvedValue(fake.client);
    const { result } = renderHook(() => useRunnerScores());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.player).toBeNull();

    act(() => {
      result.current.onRunStart();
      result.current.onGameOver(30);
    });
    expect(fake.raw.rpc).not.toHaveBeenCalledWith('start_runner_run');
    expect(fake.raw.rpc).not.toHaveBeenCalledWith('submit_runner_score', expect.anything());
    expect(result.current.best).toBe(30);
  });

  it('signed in: loads the server best, opens a run, then submits it once', async () => {
    const fake = fakeSupabase({ user: roy });
    fake.setRpc('my_runner_best', { data: 200 });
    fake.setRpc('submit_runner_score', { data: 250 });
    getSupabase.mockResolvedValue(fake.client);
    const { result } = renderHook(() => useRunnerScores());
    await waitFor(() => expect(result.current.best).toBe(200));
    expect(result.current.player).toEqual({ firstName: 'Roy' });

    act(() => result.current.onRunStart());
    expect(fake.raw.rpc).toHaveBeenCalledWith('start_runner_run');

    act(() => result.current.onGameOver(250));
    expect(result.current.best).toBe(250); // raised at once, before the server answers
    await waitFor(() => expect(fake.raw.rpc).toHaveBeenCalledWith('submit_runner_score', { p_score: 250 }));

    // A second game over without a new start has no open run to close.
    act(() => result.current.onGameOver(10));
    await waitFor(() =>
      expect(fake.raw.rpc.mock.calls.filter(c => c[0] === 'submit_runner_score')).toHaveLength(1),
    );
    expect(result.current.saveError).toBe(false);
  });

  it('flags a run the server refused, and does not submit one it never opened', async () => {
    const fake = fakeSupabase({ user: roy });
    fake.setRpc('submit_runner_score', { error: new Error('implausible score') });
    getSupabase.mockResolvedValue(fake.client);
    const { result } = renderHook(() => useRunnerScores());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => {
      result.current.onRunStart();
      result.current.onGameOver(999);
    });
    await waitFor(() => expect(result.current.saveError).toBe(true));

    fake.setRpc('start_runner_run', { error: new Error('offline') });
    fake.raw.rpc.mockClear();
    act(() => {
      result.current.onRunStart();
    });
    expect(result.current.saveError).toBe(false); // a new run clears the old flag
    act(() => result.current.onGameOver(5));
    await waitFor(() => expect(result.current.saveError).toBe(true));
    expect(fake.raw.rpc).not.toHaveBeenCalledWith('submit_runner_score', expect.anything());
  });

  it('loads the leaderboard, and flags a failed load', async () => {
    const fake = fakeSupabase();
    fake.setRpc('runner_leaderboard', { data: [{ rank: 1, display_name: 'Roy C.', best_score: 9, is_me: false }] });
    getSupabase.mockResolvedValue(fake.client);
    const { result } = renderHook(() => useRunnerScores());
    await waitFor(() => expect(result.current.leaderboard).toHaveLength(1));

    fake.setRpc('runner_leaderboard', { error: new Error('down') });
    act(() => result.current.refreshLeaderboard());
    await waitFor(() => expect(result.current.leaderboardError).toBe(true));
  });

  it('follows sign-in and sign-out', async () => {
    const fake = fakeSupabase();
    getSupabase.mockResolvedValue(fake.client);
    const { result } = renderHook(() => useRunnerScores());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => fake.signInAs(roy));
    expect(result.current.player).toEqual({ firstName: 'Roy' });
    act(() => result.current.signOut());
    await waitFor(() => expect(result.current.player).toBeNull());
  });

  it('flags a sign-in that could not start', async () => {
    const fake = fakeSupabase();
    fake.raw.auth.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: new Error('down') } as never);
    getSupabase.mockResolvedValue(fake.client);
    const { result } = renderHook(() => useRunnerScores());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.signIn());
    await waitFor(() => expect(result.current.signInError).toBe(true));
  });
});
