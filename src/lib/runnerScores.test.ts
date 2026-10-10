import { describe, it, expect, vi } from 'vitest';
import {
  LOCAL_BEST_KEY,
  MAX_SCORE,
  ScoreApi,
  ScoreApiError,
  normalizeScore,
  parseLeaderboard,
  readLocalBest,
  saveLocalBest,
} from './runnerScores';

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
  it('keeps well-formed rows, Hebrew names included', () => {
    expect(
      parseLeaderboard([
        { rank: 1, name: 'רועי כ.', score: 700, isMe: false },
        { rank: 2, name: 'Roy C.', score: 480, isMe: true },
      ]),
    ).toEqual([
      { rank: 1, name: 'רועי כ.', score: 700, isMe: false },
      { rank: 2, name: 'Roy C.', score: 480, isMe: true },
    ]);
  });

  it('drops malformed rows and non-arrays', () => {
    expect(parseLeaderboard(null)).toEqual([]);
    expect(parseLeaderboard({ rank: 1 })).toEqual([]);
    expect(
      parseLeaderboard([
        null,
        'row',
        { rank: 0, name: 'A', score: 1 },
        { rank: '1', name: 'A', score: 1 },
        { rank: 1, name: 7, score: 1 },
        { rank: 1, name: '', score: 1 },
        { rank: 1, name: 'B', score: -3 },
        { rank: 1, name: 'C', score: 5, isMe: 'yes' },
      ]),
    ).toEqual([{ rank: 1, name: 'C', score: 5, isMe: false }]);
  });
});

/** A fetch that answers each `METHOD path` with a status and JSON body, and records calls. */
function fakeFetch(routes: Record<string, [number, unknown]>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    const [status, body] = routes[key] ?? [404, { error: 'not_found' }];
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  });
}

describe('ScoreApi', () => {
  it('reads the session, tolerating a malformed player', async () => {
    let f = fakeFetch({ 'GET /api/session': [200, { player: { firstName: 'Roy' }, best: 120 }] });
    expect(await new ScoreApi(f as unknown as typeof fetch).session()).toEqual({ player: { firstName: 'Roy' }, best: 120 });
    f = fakeFetch({ 'GET /api/session': [200, { player: { firstName: 3 }, best: -1 }] });
    expect(await new ScoreApi(f as unknown as typeof fetch).session()).toEqual({ player: null, best: 0 });
  });

  it('posts the Google credential as JSON, same-origin', async () => {
    const f = fakeFetch({ 'POST /api/session': [200, { player: { firstName: 'Roy' }, best: 0 }] });
    await new ScoreApi(f as unknown as typeof fetch).signIn('tok');
    const [, init] = f.mock.calls[0];
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', body: JSON.stringify({ credential: 'tok' }) });
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('starts and submits runs, sending whole scores', async () => {
    const f = fakeFetch({ 'POST /api/runs': [200, { best: 900 }] });
    const api = new ScoreApi(f as unknown as typeof fetch);
    await api.startRun();
    await expect(api.submit(412.8)).resolves.toBe(900);
    expect(f.mock.calls.map(c => c[1]?.body)).toEqual([
      JSON.stringify({ action: 'start' }),
      JSON.stringify({ action: 'submit', score: 412 }),
    ]);
  });

  it('refuses an invalid score before any request', async () => {
    const f = fakeFetch({});
    await expect(new ScoreApi(f as unknown as typeof fetch).submit(-1)).rejects.toThrow(RangeError);
    expect(f).not.toHaveBeenCalled();
  });

  it('turns error answers into ScoreApiError with the server code', async () => {
    const f = fakeFetch({ 'POST /api/runs': [422, { error: 'implausible_score' }], 'GET /api/session': [503, undefined] });
    const api = new ScoreApi(f as unknown as typeof fetch);
    await expect(api.submit(5)).rejects.toMatchObject({ status: 422, code: 'implausible_score' });
    await expect(api.session()).rejects.toBeInstanceOf(ScoreApiError);
  });

  it('reads the leaderboard with the limit', async () => {
    const f = fakeFetch({ 'GET /api/leaderboard?limit=10': [200, { rows: [{ rank: 1, name: 'Roy C.', score: 5, isMe: true }] }] });
    expect(await new ScoreApi(f as unknown as typeof fetch).leaderboard()).toEqual([
      { rank: 1, name: 'Roy C.', score: 5, isMe: true },
    ]);
  });

  it('signs out with DELETE', async () => {
    const f = fakeFetch({ 'DELETE /api/session': [200, { player: null, best: 0 }] });
    await new ScoreApi(f as unknown as typeof fetch).signOut();
    expect(f).toHaveBeenCalledWith('/api/session', expect.objectContaining({ method: 'DELETE' }));
  });
});
