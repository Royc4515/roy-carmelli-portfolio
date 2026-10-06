import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import type { Query } from '../store.js';

/** Messages one visitor may send per UTC day. A real conversation is rarely longer than this. */
export const PER_VISITOR_DAILY = 15;
/**
 * Messages the whole site may send per UTC day. Two models at ~200K free tokens/day each and
 * ~2.5K tokens per uncached request give ~160; staying under it means Groq never has to say no.
 */
export const GLOBAL_DAILY = 150;

export type LimitVerdict = 'ok' | 'rate_limited' | 'daily_cap';

export interface ChatLimiter {
  /** Counts one message for `visitor` on `day` (YYYY-MM-DD, UTC) and says whether it may go out. */
  take(visitor: string, day: string): Promise<LimitVerdict>;
}

/** The visitor's bucket key: a salted hash, so the table never holds an IP address. */
export function visitorBucket(ip: string, day: string, salt: string): string {
  return `ip:${createHash('sha256').update(`${salt}|${day}|${ip}`).digest('hex').slice(0, 32)}`;
}

/** The caller's IP as Vercel reports it; `null` outside Vercel (tests, local tools). */
export function clientIp(request: Request): string | null {
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || null;
}

// Idempotent, like the scoreboard's schema: the first chat request creates the table.
const SCHEMA = [
  `create table if not exists chat_usage (
     bucket text primary key check (char_length(bucket) between 1 and 100),
     day    date not null,
     count  integer not null default 0
   )`,
];

export class PgChatLimiter implements ChatLimiter {
  private schemaReady: Promise<void> | null = null;

  constructor(
    private readonly query: Query,
    private readonly salt: string,
  ) {}

  private ensureSchema(): Promise<void> {
    this.schemaReady ??= (async () => {
      for (const statement of SCHEMA) await this.query(statement);
    })().catch(err => {
      this.schemaReady = null;
      throw err;
    });
    return this.schemaReady;
  }

  private async bump(bucket: string, day: string): Promise<number> {
    const rows = await this.query(
      `insert into chat_usage as u (bucket, day, count) values ($1, $2::date, 1)
       on conflict (bucket) do update set count = u.count + 1
       returning count`,
      [bucket, day],
    );
    return Number(rows[0]?.count ?? Infinity);
  }

  async take(visitor: string, day: string): Promise<LimitVerdict> {
    await this.ensureSchema();
    if ((await this.bump(visitorBucket(visitor, day, this.salt), day)) > PER_VISITOR_DAILY) return 'rate_limited';
    const total = await this.bump(`global:${day}`, day);
    // The first message of a day clears out what is older than yesterday: the hashes are useless
    // after their day anyway, and the privacy page promises about a day.
    if (total === 1) await this.query(`delete from chat_usage where day < $1::date - 1`, [day]);
    return total > GLOBAL_DAILY ? 'daily_cap' : 'ok';
  }
}

let shared: { url: string; limiter: ChatLimiter } | null = null;

export function limiterFor(databaseUrl: string, salt: string): ChatLimiter {
  if (shared?.url !== databaseUrl) {
    const sql = neon(databaseUrl);
    shared = { url: databaseUrl, limiter: new PgChatLimiter((text, params) => sql.query(text, params), salt) };
  }
  return shared.limiter;
}
