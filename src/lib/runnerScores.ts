import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Same ceiling as the `best_score` check in supabase/migrations/*_runner_scores.sql. */
export const MAX_SCORE = 1_000_000;
/** Rows the leaderboard shows (the server adds the player's own row when it is below them). */
export const LEADERBOARD_SIZE = 10;
/** Signed-out personal best on this device. */
export const LOCAL_BEST_KEY = 'roy-runner-best';
/** Query param on the OAuth return URL: tells main.tsx the visit is a sign-in coming back. */
export const AUTH_RETURN_PARAM = 'runner';

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

/** Rows from `runner_leaderboard`, dropping any that are not well-formed. */
export function parseLeaderboard(rows: unknown): LeaderboardEntry[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap(row => {
    if (typeof row !== 'object' || row === null) return [];
    const { rank, display_name, best_score, is_me } = row as Record<string, unknown>;
    const score = normalizeScore(best_score);
    const r = Number(rank); // bigint arrives as a number or a numeric string
    if (score === null || !Number.isInteger(r) || r < 1 || typeof display_name !== 'string') return [];
    return [{ rank: r, name: display_name, score, isMe: is_me === true }];
  });
}

export interface Player {
  /** First name from the Google profile, shown in the "Signed in as" line. */
  firstName: string;
}

export function playerFromUser(user: User | null | undefined): Player | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const full = [meta.full_name, meta.name].find(v => typeof v === 'string' && v.trim()) as string | undefined;
  return { firstName: full?.trim().split(/\s+/)[0] ?? 'Player' };
}

/**
 * Roy Runner's online scoreboard: Google sign-in, one best per player, a public top 10.
 * All writes go through database functions that check the score against the time the run
 * really took (see the migration); this class only calls them and validates what comes back.
 */
export class ScoreService {
  constructor(private readonly client: SupabaseClient) {}

  async getPlayer(): Promise<Player | null> {
    const { data } = await this.client.auth.getSession();
    return playerFromUser(data.session?.user);
  }

  /** Calls `listener` on every sign-in / sign-out; returns the unsubscribe. */
  onPlayerChange(listener: (player: Player | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(playerFromUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  }

  /** Leaves the page for Google; the return lands on `returnTo` with AUTH_RETURN_PARAM set. */
  async signInWithGoogle(returnTo: string = window.location.origin + window.location.pathname): Promise<void> {
    const url = new URL(returnTo);
    url.searchParams.set(AUTH_RETURN_PARAM, '1');
    url.hash = '';
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: url.toString() },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    // This browser only: signing out of a game should not end the player's other sessions.
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }

  /** Opens a run on the server; a later `submit` is checked against its start time. */
  async startRun(): Promise<void> {
    const { error } = await this.client.rpc('start_runner_run');
    if (error) throw error;
  }

  /** Closes the open run with `score`; resolves to the player's best afterwards. */
  async submit(score: number): Promise<number> {
    const valid = normalizeScore(score);
    if (valid === null) throw new RangeError(`Not a valid score: ${score}`);
    const { data, error } = await this.client.rpc('submit_runner_score', { p_score: valid });
    if (error) throw error;
    return normalizeScore(data) ?? valid;
  }

  async myBest(): Promise<number> {
    const { data, error } = await this.client.rpc('my_runner_best');
    if (error) throw error;
    return normalizeScore(data) ?? 0;
  }

  async leaderboard(limit: number = LEADERBOARD_SIZE): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client.rpc('runner_leaderboard', { p_limit: limit });
    if (error) throw error;
    return parseLeaderboard(data);
  }
}
