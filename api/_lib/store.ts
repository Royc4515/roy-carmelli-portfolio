import { neon } from '@neondatabase/serverless';
import { MAX_SCORE } from './scoring.js';

/** Runs one parameterized statement and returns its rows. */
export type Query = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export interface LeaderboardRow {
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
}

/** Everything the scoreboard keeps. Each method is one atomic statement. */
export interface ScoreStore {
  getBest(playerId: string): Promise<number>;
  /** Opens (or restarts) the player's run, stamped with the database clock. */
  startRun(playerId: string): Promise<void>;
  /** Closes the player's run: the seconds it lasted, or `null` when none was open. */
  closeRun(playerId: string): Promise<number | null>;
  /** Keeps the higher of the stored best and `score`; returns the best afterwards. */
  saveScore(playerId: string, displayName: string, score: number): Promise<number>;
  leaderboard(limit: number, playerId: string | null): Promise<LeaderboardRow[]>;
}

// Idempotent, so it can run on every cold start: the first request after the Neon store is
// connected creates the tables and nobody has to run a migration by hand.
const SCHEMA = [
  `create table if not exists runner_scores (
     player_id    text primary key check (char_length(player_id) between 1 and 300),
     display_name text not null check (char_length(display_name) between 1 and 32),
     best_score   integer not null check (best_score between 0 and ${MAX_SCORE}),
     updated_at   timestamptz not null default now()
   )`,
  `create index if not exists runner_scores_rank_idx on runner_scores (best_score desc, updated_at asc)`,
  `create table if not exists runner_runs (
     player_id  text primary key check (char_length(player_id) between 1 and 300),
     started_at timestamptz not null default now()
   )`,
];

export class PgScoreStore implements ScoreStore {
  private schemaReady: Promise<void> | null = null;

  constructor(private readonly query: Query) {}

  private ensureSchema(): Promise<void> {
    this.schemaReady ??= (async () => {
      for (const statement of SCHEMA) await this.query(statement);
    })().catch(err => {
      this.schemaReady = null; // retry on the next request instead of failing forever
      throw err;
    });
    return this.schemaReady;
  }

  async getBest(playerId: string): Promise<number> {
    await this.ensureSchema();
    const rows = await this.query('select best_score from runner_scores where player_id = $1', [playerId]);
    return Number(rows[0]?.best_score ?? 0);
  }

  async startRun(playerId: string): Promise<void> {
    await this.ensureSchema();
    await this.query(
      `insert into runner_runs (player_id, started_at) values ($1, now())
       on conflict (player_id) do update set started_at = excluded.started_at`,
      [playerId],
    );
  }

  async closeRun(playerId: string): Promise<number | null> {
    await this.ensureSchema();
    // Deleting and measuring in one statement: a replayed submit finds no run to close.
    const rows = await this.query(
      `delete from runner_runs where player_id = $1
       returning extract(epoch from now() - started_at)::float8 as elapsed`,
      [playerId],
    );
    return rows.length ? Number(rows[0].elapsed) : null;
  }

  async saveScore(playerId: string, displayName: string, score: number): Promise<number> {
    await this.ensureSchema();
    const rows = await this.query(
      `insert into runner_scores as s (player_id, display_name, best_score) values ($1, $2, $3)
       on conflict (player_id) do update
         set best_score   = greatest(s.best_score, excluded.best_score),
             display_name = excluded.display_name,
             -- ties rank by who got there first, so only a new best moves the timestamp
             updated_at   = case when excluded.best_score > s.best_score then now() else s.updated_at end
       returning best_score`,
      [playerId, displayName, score],
    );
    return Number(rows[0].best_score);
  }

  async leaderboard(limit: number, playerId: string | null): Promise<LeaderboardRow[]> {
    await this.ensureSchema();
    // Top `limit`, plus the caller's own row when it is further down.
    const rows = await this.query(
      `with ranked as (
         select player_id, display_name, best_score,
                rank() over (order by best_score desc) as rank,
                row_number() over (order by best_score desc, updated_at asc) as pos
         from runner_scores
       )
       select rank::int as rank, display_name, best_score, coalesce(player_id = $2, false) as is_me
       from ranked
       where pos <= $1 or player_id = $2
       order by pos`,
      [limit, playerId],
    );
    return rows.map(r => ({
      rank: Number(r.rank),
      name: String(r.display_name),
      score: Number(r.best_score),
      isMe: r.is_me === true,
    }));
  }
}

// One store per warm instance, so the schema check runs once per cold start.
let shared: { url: string; store: ScoreStore } | null = null;

export function storeFor(databaseUrl: string): ScoreStore {
  if (shared?.url !== databaseUrl) {
    const sql = neon(databaseUrl);
    shared = { url: databaseUrl, store: new PgScoreStore((text, params) => sql.query(text, params)) };
  }
  return shared.store;
}
