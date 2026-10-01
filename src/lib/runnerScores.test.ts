import { describe, it, expect, vi } from 'vitest';
import {
  AUTH_RETURN_PARAM,
  LOCAL_BEST_KEY,
  MAX_SCORE,
  ScoreService,
  normalizeScore,
  parseLeaderboard,
  playerFromUser,
  readLocalBest,
  saveLocalBest,
} from './runnerScores';
import { fakeSupabase } from '../test/fakeSupabase';
import type { User } from '@supabase/supabase-js';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

const throwing = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('normalizeScore', () => {
  it('floors valid scores', () => {
    expect(normalizeScore(0)).toBe(0);
    expect(normalizeScore(12.9)).toBe(12);
    expect(normalizeScore(MAX_SCORE)).toBe(MAX_SCORE);
  });

  it.each([-1, MAX_SCORE + 1, NaN, Infinity, -Infinity, '12', null, undefined, {}])(
    'rejects %s',
    raw => expect(normalizeScore(raw)).toBeNull(),
  );
});

describe('local best', () => {
  it('reads 0 when nothing, junk or an out-of-range value is stored', () => {
    expect(readLocalBest(memoryStorage())).toBe(0);
    expect(readLocalBest(memoryStorage({ [LOCAL_BEST_KEY]: 'abc' }))).toBe(0);
    expect(readLocalBest(memoryStorage({ [LOCAL_BEST_KEY]: '-5' }))).toBe(0);
    expect(readLocalBest(memoryStorage({ [LOCAL_BEST_KEY]: '99999999' }))).toBe(0);
  });

  it('only ever raises the stored best', () => {
    const storage = memoryStorage();
    expect(saveLocalBest(120, storage)).toBe(120);
    expect(saveLocalBest(80, storage)).toBe(120);
    expect(saveLocalBest(300.7, storage)).toBe(300);
    expect(readLocalBest(storage)).toBe(300);
  });

  it('survives storage that throws (private mode, blocked site data)', () => {
    expect(readLocalBest(throwing)).toBe(0);
    expect(saveLocalBest(50, throwing)).toBe(50);
    expect(readLocalBest(undefined)).toBe(0);
  });
});

describe('parseLeaderboard', () => {
  it('maps rows and accepts bigint ranks sent as strings', () => {
    expect(
      parseLeaderboard([
        { rank: 1, display_name: 'Roy C.', best_score: 700, is_me: true },
        { rank: '2', display_name: 'רועי כ.', best_score: 480, is_me: false },
      ]),
    ).toEqual([
      { rank: 1, name: 'Roy C.', score: 700, isMe: true },
      { rank: 2, name: 'רועי כ.', score: 480, isMe: false },
    ]);
  });

  it('drops malformed rows and non-arrays', () => {
    expect(parseLeaderboard(null)).toEqual([]);
    expect(parseLeaderboard({ rank: 1 })).toEqual([]);
    expect(
      parseLeaderboard([
        null,
        'row',
        { rank: 0, display_name: 'A', best_score: 1 },
        { rank: 1, display_name: 7, best_score: 1 },
        { rank: 1, display_name: 'B', best_score: -3 },
        { rank: 1, display_name: 'C', best_score: 5, is_me: 'yes' },
      ]),
    ).toEqual([{ rank: 1, name: 'C', score: 5, isMe: false }]);
  });
});

describe('playerFromUser', () => {
  const user = (meta: Record<string, unknown>) => ({ user_metadata: meta }) as unknown as User;

  it('takes the first name of the Google profile', () => {
    expect(playerFromUser(user({ full_name: '  Roy   Carmelli ' }))).toEqual({ firstName: 'Roy' });
    expect(playerFromUser(user({ name: 'רועי כרמלי' }))).toEqual({ firstName: 'רועי' });
  });

  it('falls back to "Player" with no usable name, and null with no user', () => {
    expect(playerFromUser(user({ full_name: '   ' }))).toEqual({ firstName: 'Player' });
    expect(playerFromUser(user({}))).toEqual({ firstName: 'Player' });
    expect(playerFromUser(null)).toBeNull();
  });
});

describe('ScoreService', () => {
  it('signs in with Google and comes back to the page with the return marker, without a hash', async () => {
    const fake = fakeSupabase();
    await new ScoreService(fake.client).signInWithGoogle('https://example.com/?x=1#projects');
    expect(fake.raw.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `https://example.com/?x=1&${AUTH_RETURN_PARAM}=1` },
    });
  });

  it('throws when the OAuth redirect cannot start', async () => {
    const fake = fakeSupabase();
    fake.raw.auth.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: new Error('down') } as never);
    await expect(new ScoreService(fake.client).signInWithGoogle('https://example.com/')).rejects.toThrow('down');
  });

  it('submits whole scores and returns the server best', async () => {
    const fake = fakeSupabase();
    fake.setRpc('submit_runner_score', { data: 900 });
    await expect(new ScoreService(fake.client).submit(412.8)).resolves.toBe(900);
    expect(fake.raw.rpc).toHaveBeenCalledWith('submit_runner_score', { p_score: 412 });
  });

  it('refuses an invalid score before any request', async () => {
    const fake = fakeSupabase();
    await expect(new ScoreService(fake.client).submit(-1)).rejects.toThrow(RangeError);
    expect(fake.raw.rpc).not.toHaveBeenCalled();
  });

  it('surfaces server errors (e.g. an implausible score)', async () => {
    const fake = fakeSupabase();
    fake.setRpc('submit_runner_score', { error: new Error('implausible score') });
    await expect(new ScoreService(fake.client).submit(10)).rejects.toThrow('implausible score');
  });

  it('reads the leaderboard and the best through the database functions', async () => {
    const fake = fakeSupabase();
    fake.setRpc('runner_leaderboard', { data: [{ rank: 1, display_name: 'Roy C.', best_score: 5, is_me: false }] });
    fake.setRpc('my_runner_best', { data: 77 });
    const svc = new ScoreService(fake.client);
    await expect(svc.leaderboard()).resolves.toEqual([{ rank: 1, name: 'Roy C.', score: 5, isMe: false }]);
    expect(fake.raw.rpc).toHaveBeenCalledWith('runner_leaderboard', { p_limit: 10 });
    await expect(svc.myBest()).resolves.toBe(77);
  });

  it('reports sign-in and sign-out to listeners, and unsubscribes', async () => {
    const fake = fakeSupabase();
    const svc = new ScoreService(fake.client);
    const listener = vi.fn();
    const stop = svc.onPlayerChange(listener);
    fake.signInAs({ user_metadata: { full_name: 'Roy Carmelli' } });
    expect(listener).toHaveBeenLastCalledWith({ firstName: 'Roy' });
    await svc.signOut();
    expect(listener).toHaveBeenLastCalledWith(null);
    stop();
    fake.signInAs({ user_metadata: {} });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
