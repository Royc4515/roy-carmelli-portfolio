/** Server settings, read per request so a missing var answers 503 instead of crashing at import. */
export interface ServerConfig {
  googleClientId: string;
  sessionSecret: Uint8Array;
  databaseUrl: string;
}

/** HS256 wants at least 256 bits; a short secret would make session cookies guessable. */
const MIN_SECRET_LENGTH = 32;

type Env = Record<string, string | undefined>;

/**
 * The scoreboard's server config, or `null` when any piece is missing or unsafe.
 *
 * The Google client ID is shared with the browser build (VITE_GOOGLE_CLIENT_ID), so one var
 * serves both; Vercel exposes every project var to functions. The Neon integration names its
 * URL DATABASE_URL (POSTGRES_URL on older connections).
 */
export function readServerConfig(env: Env = process.env): ServerConfig | null {
  const googleClientId = (env.VITE_GOOGLE_CLIENT_ID ?? env.GOOGLE_CLIENT_ID)?.trim();
  const secret = env.SESSION_SECRET?.trim();
  const databaseUrl = (env.DATABASE_URL ?? env.POSTGRES_URL)?.trim();
  if (!googleClientId || !databaseUrl || !secret || secret.length < MIN_SECRET_LENGTH) return null;
  return { googleClientId, sessionSecret: new TextEncoder().encode(secret), databaseUrl };
}
