import type { Deps } from '../_lib/deps.js';
import type { LeaderboardRow, ScoreStore } from '../_lib/store.js';
import { readServerConfig } from '../_lib/config.js';

export const ORIGIN = 'https://roy-carmelli-portfolio.vercel.app';
export const CLIENT_ID = 'client-123.apps.googleusercontent.com';

export const config = readServerConfig({
  VITE_GOOGLE_CLIENT_ID: CLIENT_ID,
  SESSION_SECRET: 'x'.repeat(40),
  DATABASE_URL: 'postgres://fake',
})!;

/** In-memory ScoreStore with a settable clock, so run lengths are exact. */
export class MemoryStore implements ScoreStore {
  now = 0;
  fail = false;
  readonly runs = new Map<string, number>();
  readonly scores = new Map<string, { name: string; best: number; at: number }>();

  private check() {
    if (this.fail) throw new Error('db down');
  }
  async getBest(id: string) {
    this.check();
    return this.scores.get(id)?.best ?? 0;
  }
  async startRun(id: string) {
    this.check();
    this.runs.set(id, this.now);
  }
  async closeRun(id: string) {
    this.check();
    const started = this.runs.get(id);
    this.runs.delete(id);
    return started === undefined ? null : this.now - started;
  }
  async saveScore(id: string, name: string, score: number) {
    this.check();
    const prev = this.scores.get(id);
    const best = Math.max(prev?.best ?? 0, score);
    this.scores.set(id, { name, best, at: prev && best === prev.best ? prev.at : this.now });
    return best;
  }
  async leaderboard(limit: number, me: string | null): Promise<LeaderboardRow[]> {
    this.check();
    const sorted = [...this.scores].sort((a, b) => b[1].best - a[1].best || a[1].at - b[1].at);
    return sorted
      .map(([id, s], i) => ({ id, pos: i + 1, rank: sorted.findIndex(x => x[1].best === s.best) + 1, s }))
      .filter(r => r.pos <= limit || r.id === me)
      .map(r => ({ rank: r.rank, name: r.s.name, score: r.s.best, isMe: r.id === me }));
  }
}

export function deps(store = new MemoryStore(), over: Partial<Deps> = {}): Deps {
  return {
    config,
    store: () => store,
    verifyGoogle: async token =>
      token === 'good-token' ? { sub: '42', given_name: 'Roy', family_name: 'Carmelli', name: 'Roy Carmelli' } : null,
    ...over,
  };
}

export function req(
  path: string,
  init: { method?: string; body?: unknown; origin?: string | null; cookie?: string; contentType?: string } = {},
): Request {
  const headers = new Headers();
  if (init.origin !== null) headers.set('origin', init.origin ?? ORIGIN);
  if (init.cookie) headers.set('cookie', init.cookie);
  if (init.body !== undefined) headers.set('content-type', init.contentType ?? 'application/json');
  return new Request(ORIGIN + path, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : typeof init.body === 'string' ? init.body : JSON.stringify(init.body),
  });
}

/** "name=value" from a Set-Cookie header, ready for a Cookie header. */
export function cookieFrom(res: Response): string {
  return (res.headers.get('set-cookie') ?? '').split(';')[0];
}
