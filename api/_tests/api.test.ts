// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { handleGetSession, handleSignIn, handleSignOut } from '../session.js';
import { handleRuns } from '../runs.js';
import { handleLeaderboard } from '../leaderboard.js';
import { MemoryStore, cookieFrom, deps, req } from './fakes.js';
import { createSessionCookie, SESSION_COOKIE } from '../_lib/session.js';
import { readServerConfig } from '../_lib/config.js';

async function signIn(d = deps()) {
  const res = await handleSignIn(req('/api/session', { method: 'POST', body: { credential: 'good-token' } }), d);
  return { res, cookie: cookieFrom(res) };
}

describe('readServerConfig', () => {
  const ok = { VITE_GOOGLE_CLIENT_ID: 'id', SESSION_SECRET: 's'.repeat(32), DATABASE_URL: 'postgres://x' };
  it('accepts a full config, with GOOGLE_CLIENT_ID and POSTGRES_URL as fallbacks', () => {
    expect(readServerConfig(ok)).not.toBeNull();
    expect(
      readServerConfig({ GOOGLE_CLIENT_ID: 'id', SESSION_SECRET: ok.SESSION_SECRET, POSTGRES_URL: 'postgres://x' }),
    ).not.toBeNull();
  });
  it.each([
    ['no client id', { ...ok, VITE_GOOGLE_CLIENT_ID: undefined }],
    ['no database', { ...ok, DATABASE_URL: undefined }],
    ['no secret', { ...ok, SESSION_SECRET: undefined }],
    ['a short secret', { ...ok, SESSION_SECRET: 'short' }],
  ])('is off with %s', (_label, env) => {
    expect(readServerConfig(env)).toBeNull();
  });
});

describe('unconfigured server', () => {
  it('answers 503 on every endpoint', async () => {
    const d = deps(undefined, { config: null });
    expect((await handleGetSession(req('/api/session'), d)).status).toBe(503);
    expect((await handleSignIn(req('/api/session', { method: 'POST', body: {} }), d)).status).toBe(503);
    expect((await handleRuns(req('/api/runs', { method: 'POST', body: {} }), d)).status).toBe(503);
    expect((await handleLeaderboard(req('/api/leaderboard'), d)).status).toBe(503);
  });
});

describe('/api/session', () => {
  it('signed out: no player, best 0, never cached', async () => {
    const res = await handleGetSession(req('/api/session'), deps());
    expect(await res.json()).toEqual({ player: null, best: 0 });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('signs in with a valid Google token and sets a hardened session cookie', async () => {
    const { res } = await signIn();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ player: { firstName: 'Roy' }, best: 0 });
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie.startsWith(`${SESSION_COOKIE}=`)).toBe(true);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
  });

  it('the cookie restores the session and the stored best', async () => {
    const store = new MemoryStore();
    store.scores.set('google:42', { name: 'Roy C.', best: 300, at: 0 });
    const { cookie } = await signIn(deps(store));
    const res = await handleGetSession(req('/api/session', { cookie }), deps(store));
    expect(await res.json()).toEqual({ player: { firstName: 'Roy' }, best: 300 });
  });

  it('stays signed in (best 0) when the database is down', async () => {
    const store = new MemoryStore();
    const { cookie } = await signIn(deps(store));
    store.fail = true;
    const res = await handleGetSession(req('/api/session', { cookie }), deps(store));
    expect(await res.json()).toEqual({ player: { firstName: 'Roy' }, best: 0 });
  });

  it('rejects a bad Google token, a missing one, and a cross-site or non-JSON request', async () => {
    const d = deps();
    const post = (body: unknown, opts: { origin?: string | null; contentType?: string } = {}) =>
      handleSignIn(req('/api/session', { method: 'POST', body, ...opts }), d);
    expect((await post({ credential: 'forged' })).status).toBe(401);
    expect((await post({})).status).toBe(400);
    expect((await post({ credential: 7 })).status).toBe(400);
    expect((await post({ credential: 'x'.repeat(5000) })).status).toBe(400);
    expect((await post('not json')).status).toBe(400);
    expect((await post({ credential: 'good-token' }, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await post({ credential: 'good-token' }, { origin: null })).status).toBe(403);
    expect((await post({ credential: 'good-token' }, { contentType: 'text/plain' })).status).toBe(400);
  });

  it('ignores a forged, expired or foreign-key session cookie', async () => {
    const d = deps();
    const other = readServerConfig({ VITE_GOOGLE_CLIENT_ID: 'a', SESSION_SECRET: 'y'.repeat(40), DATABASE_URL: 'p' })!;
    const foreign = (
      await createSessionCookie({ playerId: 'google:1', displayName: 'Evil E.', firstName: 'Evil' }, other.sessionSecret)
    ).split(';')[0];
    for (const cookie of [foreign, `${SESSION_COOKIE}=garbage`]) {
      const res = await handleGetSession(req('/api/session', { cookie }), d);
      expect(await res.json()).toEqual({ player: null, best: 0 });
    }
  });

  it('signs out by expiring the cookie, same-origin only', async () => {
    const res = await handleSignOut(req('/api/session', { method: 'DELETE' }));
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/);
    expect((await handleSignOut(req('/api/session', { method: 'DELETE', origin: 'https://evil.example' }))).status).toBe(403);
  });
});

describe('/api/runs', () => {
  const run = (cookie: string, body: unknown, d: ReturnType<typeof deps>) =>
    handleRuns(req('/api/runs', { method: 'POST', body, cookie }), d);

  it('needs a session', async () => {
    expect((await run('', { action: 'start' }, deps())).status).toBe(401);
  });

  it('start then submit saves the best; a replayed submit has no run to close', async () => {
    const store = new MemoryStore();
    const d = deps(store);
    const { cookie } = await signIn(d);
    expect((await run(cookie, { action: 'start' }, d)).status).toBe(200);
    store.now = 60; // 60 s later: up to 528 points are plausible
    const res = await run(cookie, { action: 'submit', score: 480 }, d);
    expect(await res.json()).toEqual({ best: 480 });
    expect(store.scores.get('google:42')).toMatchObject({ name: 'Roy C.', best: 480 });
    expect((await run(cookie, { action: 'submit', score: 480 }, d)).status).toBe(409);
  });

  it('rejects a score faster than the clock allows, and closes that run', async () => {
    const store = new MemoryStore();
    const d = deps(store);
    const { cookie } = await signIn(d);
    await run(cookie, { action: 'start' }, d);
    store.now = 10;
    const res = await run(cookie, { action: 'submit', score: 999_999 }, d);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'implausible_score' });
    expect(store.runs.size).toBe(0);
    expect(store.scores.size).toBe(0);
  });

  it.each([-1, 1.5, '100', null, 1_000_001])('rejects score %j as invalid without closing the run', async score => {
    const store = new MemoryStore();
    const d = deps(store);
    const { cookie } = await signIn(d);
    await run(cookie, { action: 'start' }, d);
    expect((await run(cookie, { action: 'submit', score }, d)).status).toBe(422);
    expect(store.runs.size).toBe(1);
  });

  it('rejects unknown actions, cross-site writes and database failures cleanly', async () => {
    const store = new MemoryStore();
    const d = deps(store);
    const { cookie } = await signIn(d);
    expect((await run(cookie, { action: 'win' }, d)).status).toBe(400);
    const crossSite = await handleRuns(
      req('/api/runs', { method: 'POST', body: { action: 'start' }, cookie, origin: 'https://evil.example' }),
      d,
    );
    expect(crossSite.status).toBe(403);
    store.fail = true;
    expect((await run(cookie, { action: 'start' }, d)).status).toBe(500);
  });
});

describe('/api/leaderboard', () => {
  function seeded() {
    const store = new MemoryStore();
    store.scores.set('google:1', { name: 'רועי כ.', best: 700, at: 1 });
    store.scores.set('google:42', { name: 'Roy C.', best: 5, at: 2 });
    store.scores.set('google:3', { name: 'Dana L.', best: 480, at: 3 });
    return store;
  }

  it('lists the top scores for anyone, nobody marked', async () => {
    const res = await handleLeaderboard(req('/api/leaderboard'), deps(seeded()));
    const { rows } = await res.json();
    expect(rows.map((r: { name: string }) => r.name)).toEqual(['רועי כ.', 'Dana L.', 'Roy C.']);
    expect(rows.some((r: { isMe: boolean }) => r.isMe)).toBe(false);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('marks the caller and adds their row below the limit', async () => {
    const store = seeded();
    const { cookie } = await signIn(deps(store));
    const { rows } = await (await handleLeaderboard(req('/api/leaderboard?limit=1', { cookie }), deps(store))).json();
    expect(rows).toEqual([
      { rank: 1, name: 'רועי כ.', score: 700, isMe: false },
      { rank: 3, name: 'Roy C.', score: 5, isMe: true },
    ]);
  });

  it('clamps the limit and survives junk', async () => {
    const store = seeded();
    const seen: number[] = [];
    const spy = deps(store, {
      store: () => ({ ...store, leaderboard: async (limit: number) => (seen.push(limit), []) }) as unknown as MemoryStore,
    });
    for (const q of ['?limit=0', '?limit=9999', '?limit=abc', '?limit=2.5', '']) {
      await handleLeaderboard(req(`/api/leaderboard${q}`), spy);
    }
    expect(seen).toEqual([1, 50, 10, 10, 10]);
  });

  it('answers 500 when the database is down', async () => {
    const store = seeded();
    store.fail = true;
    expect((await handleLeaderboard(req('/api/leaderboard'), deps(store))).status).toBe(500);
  });
});
