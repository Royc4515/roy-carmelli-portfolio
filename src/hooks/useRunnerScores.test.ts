import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LOCAL_BEST_KEY, ScoreApi } from '../lib/runnerScores';

const config = vi.hoisted(() => ({ enabled: true }));
vi.mock('../lib/scoreboardConfig', () => ({ isScoreboardConfigured: () => config.enabled }));

import { useRunnerScores } from './useRunnerScores';

/** A ScoreApi whose methods are spies with sensible signed-out answers. */
function fakeApi(over: Partial<Record<keyof ScoreApi, unknown>> = {}) {
  const api = {
    session: vi.fn(async () => ({ player: null, best: 0 })),
    signIn: vi.fn(async () => ({ player: { firstName: 'Roy' }, best: 200 })),
    signOut: vi.fn(async () => {}),
    startRun: vi.fn(async () => {}),
    submit: vi.fn(async (score: number) => score),
    leaderboard: vi.fn(async () => []),
    ...over,
  };
  return api as unknown as ScoreApi & typeof api;
}

const signedIn = () => fakeApi({ session: vi.fn(async () => ({ player: { firstName: 'Roy' }, best: 200 })) });

beforeEach(() => {
  window.localStorage.clear();
  config.enabled = true;
});

describe('useRunnerScores', () => {
  it('without a client ID: offline, never calls the API, best kept on this device', () => {
    config.enabled = false;
    window.localStorage.setItem(LOCAL_BEST_KEY, '40');
    const api = fakeApi();
    const { result } = renderHook(() => useRunnerScores(api));
    expect(result.current.status).toBe('offline');
    expect(result.current.best).toBe(40);

    act(() => {
      result.current.onRunStart();
      result.current.onGameOver(95);
    });
    expect(result.current.best).toBe(95);
    expect(window.localStorage.getItem(LOCAL_BEST_KEY)).toBe('95');
    act(() => result.current.refreshLeaderboard());
    expect(api.session).not.toHaveBeenCalled();
    expect(api.leaderboard).not.toHaveBeenCalled();
  });

  it('signed out: ready, and runs never touch the server', async () => {
    const api = fakeApi();
    const { result } = renderHook(() => useRunnerScores(api));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => {
      result.current.onRunStart();
      result.current.onGameOver(30);
    });
    expect(api.startRun).not.toHaveBeenCalled();
    expect(api.submit).not.toHaveBeenCalled();
    expect(result.current.best).toBe(30);
  });

  it('a server that is down still lets you play, signed out', async () => {
    const api = fakeApi({ session: vi.fn(async () => Promise.reject(new Error('503'))) });
    const { result } = renderHook(() => useRunnerScores(api));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.player).toBeNull();
  });

  it('signed in: shows the server best, opens a run, then submits it once', async () => {
    const api = signedIn();
    api.submit.mockResolvedValue(250);
    const { result } = renderHook(() => useRunnerScores(api));
    await waitFor(() => expect(result.current.best).toBe(200));
    expect(result.current.player).toEqual({ firstName: 'Roy' });

    act(() => result.current.onRunStart());
    expect(api.startRun).toHaveBeenCalledTimes(1);
    act(() => result.current.onGameOver(250));
    expect(result.current.best).toBe(250); // raised at once, before the server answers
    await waitFor(() => expect(api.submit).toHaveBeenCalledWith(250));

    // A second game over without a new start has no open run to close.
    act(() => result.current.onGameOver(10));
    await waitFor(() => expect(api.leaderboard).toHaveBeenCalledTimes(2)); // load + after submit
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(result.current.saveError).toBe(false);
  });

  it('flags a refused run, and never submits a run that failed to open', async () => {
    const api = signedIn();
    api.submit.mockRejectedValue(new Error('implausible_score'));
    const { result } = renderHook(() => useRunnerScores(api));
    await waitFor(() => expect(result.current.player).not.toBeNull());

    act(() => {
      result.current.onRunStart();
      result.current.onGameOver(999);
    });
    await waitFor(() => expect(result.current.saveError).toBe(true));

    api.startRun.mockRejectedValue(new Error('offline'));
    api.submit.mockClear();
    act(() => result.current.onRunStart());
    expect(result.current.saveError).toBe(false); // a new run clears the old flag
    act(() => result.current.onGameOver(5));
    await waitFor(() => expect(result.current.saveError).toBe(true));
    expect(api.submit).not.toHaveBeenCalled();
  });

  it('signs in with a Google credential and signs out again', async () => {
    const api = fakeApi();
    const { result } = renderHook(() => useRunnerScores(api));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.signIn('google-token'));
    await waitFor(() => expect(result.current.player).toEqual({ firstName: 'Roy' }));
    expect(api.signIn).toHaveBeenCalledWith('google-token');
    expect(result.current.best).toBe(200);

    const disableAutoSelect = vi.fn();
    window.google = { accounts: { id: { disableAutoSelect } as never } };
    act(() => result.current.signOut());
    await waitFor(() => expect(result.current.player).toBeNull());
    expect(disableAutoSelect).toHaveBeenCalled();
    delete window.google;
  });

  it('flags a refused sign-in', async () => {
    const api = fakeApi({ signIn: vi.fn(async () => Promise.reject(new Error('401'))) });
    const { result } = renderHook(() => useRunnerScores(api));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.signIn('bad'));
    await waitFor(() => expect(result.current.signInError).toBe(true));
    expect(result.current.player).toBeNull();
  });

  it('loads the leaderboard, and flags a failed load', async () => {
    const api = fakeApi({ leaderboard: vi.fn(async () => [{ rank: 1, name: 'Roy C.', score: 9, isMe: false }]) });
    const { result } = renderHook(() => useRunnerScores(api));
    await waitFor(() => expect(result.current.leaderboard).toHaveLength(1));
    api.leaderboard.mockRejectedValue(new Error('down'));
    act(() => result.current.refreshLeaderboard());
    await waitFor(() => expect(result.current.leaderboardError).toBe(true));
  });
});
