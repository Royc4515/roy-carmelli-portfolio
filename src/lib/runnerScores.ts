/** Same ceiling as api/_lib/scoring.ts. */
export const MAX_SCORE = 1_000_000;
/** Rows the leaderboard shows (the server adds the player's own row when it is below them). */
export const LEADERBOARD_SIZE = 10;
/** Signed-out personal best on this device. */
export const LOCAL_BEST_KEY = 'roy-runner-best';

/** A whole score in 0..MAX_SCORE, or `null` for anything that is not one (NaN, negative...). */
export function normalizeScore(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const score = Math.floor(raw);
  return score >= 0 && score <= MAX_SCORE ? score : null;
}

// Storage can be missing or throw (private mode, blocked site data): a lost local best is fine.
export function readLocalBest(storage: Pick<Storage, 'getItem'> | undefined = safeLocalStorage()): number {
  try {
    return normalizeScore(Number(storage?.getItem(LOCAL_BEST_KEY))) ?? 0;
  } catch {
    return 0;
  }
}

/** Saves `score` if it beats the stored best; returns the best after the call. */
export function saveLocalBest(
  score: number,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = safeLocalStorage(),
): number {
  const best = Math.max(readLocalBest(storage), normalizeScore(score) ?? 0);
  try {
    storage?.setItem(LOCAL_BEST_KEY, String(best));
  } catch {
    /* ignore */
  }
  return best;
}

function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
}

/** Rows from GET /api/leaderboard, dropping any that are not well-formed. */
export function parseLeaderboard(rows: unknown): LeaderboardEntry[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap(row => {
    if (typeof row !== 'object' || row === null) return [];
    const { rank, name, score, isMe } = row as Record<string, unknown>;
    const s = normalizeScore(score);
    if (s === null || typeof rank !== 'number' || !Number.isInteger(rank) || rank < 1) return [];
    if (typeof name !== 'string' || !name) return [];
    return [{ rank, name, score: s, isMe: isMe === true }];
  });
}

export interface Player {
  /** First name from the Google profile, shown in the "Signed in as" line. */
  firstName: string;
}

export interface SessionState {
  player: Player | null;
  best: number;
}

function parseSession(body: unknown): SessionState {
  const { player, best } = (body ?? {}) as { player?: { firstName?: unknown } | null; best?: unknown };
  const firstName = typeof player?.firstName === 'string' && player.firstName ? player.firstName : null;
  return { player: firstName ? { firstName } : null, best: normalizeScore(best) ?? 0 };
}

/** A non-2xx answer from the API; `code` is its `error` field ("implausible_score"...). */
export class ScoreApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`Scoreboard API ${status}: ${code}`);
  }
}

type Fetch = typeof fetch;

/**
 * Client for Roy Runner's scoreboard API (the Vercel functions in /api). The session lives in
 * an HttpOnly cookie the browser sends on its own, so nothing here touches tokens.
 */
export class ScoreApi {
  constructor(
    private readonly fetchFn: Fetch = (...args) => fetch(...args),
    private readonly base = '/api',
  ) {}

  private async call(path: string, init: { method?: string; body?: unknown } = {}): Promise<unknown> {
    const res = await this.fetchFn(`${this.base}${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* empty or non-JSON body */
    }
    if (!res.ok) {
      const code = (body as { error?: unknown } | null)?.error;
      throw new ScoreApiError(res.status, typeof code === 'string' ? code : 'unknown');
    }
    return body;
  }

  async session(): Promise<SessionState> {
    return parseSession(await this.call('/session'));
  }

  /** Exchanges a Google ID token (from the Sign in with Google button) for a session. */
  async signIn(credential: string): Promise<SessionState> {
    return parseSession(await this.call('/session', { method: 'POST', body: { credential } }));
  }

  async signOut(): Promise<void> {
    await this.call('/session', { method: 'DELETE' });
  }

  /** Opens a run on the server; a later `submit` is checked against its start time. */
  async startRun(): Promise<void> {
    await this.call('/runs', { method: 'POST', body: { action: 'start' } });
  }

  /** Closes the open run with `score`; resolves to the player's best afterwards. */
  async submit(score: number): Promise<number> {
    const valid = normalizeScore(score);
    if (valid === null) throw new RangeError(`Not a valid score: ${score}`);
    const body = await this.call('/runs', { method: 'POST', body: { action: 'submit', score: valid } });
    return normalizeScore((body as { best?: unknown } | null)?.best) ?? valid;
  }

  async leaderboard(limit: number = LEADERBOARD_SIZE): Promise<LeaderboardEntry[]> {
    const body = await this.call(`/leaderboard?limit=${limit}`);
    return parseLeaderboard((body as { rows?: unknown } | null)?.rows);
  }
}
