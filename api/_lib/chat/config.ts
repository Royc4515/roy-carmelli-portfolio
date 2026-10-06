/** The chat agent's server config, read per request so a missing var answers 503, not a crash. */
export interface ChatConfig {
  groqApiKey: string;
  /** Tried in order; each Groq model has its own free-tier quota, so a fallback is real headroom. */
  models: string[];
  /** Jailbreak classifier, or `null` when switched off with CHAT_GUARD=off. */
  guardModel: string | null;
  databaseUrl: string;
  /** Salts the per-visitor counter hash and derives the prompt canary. */
  salt: string;
}

/** Best free-tier quality first, then a smaller model with its own separate quota. */
export const DEFAULT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
export const GUARD_MODEL = 'meta-llama/llama-prompt-guard-2-86m';

/** A short salt makes the hashed IPs guessable by brute force over the IPv4 space. */
const MIN_SALT_LENGTH = 32;
const MODEL_ID = /^[\w./:-]{1,100}$/;

type Env = Record<string, string | undefined>;

/**
 * `null` (feature off) unless the Groq key, the database and a long salt are all present.
 * Separate from the scoreboard's readServerConfig, so neither feature can switch the other off.
 * CHAT_ENABLED=false is the server-side kill switch.
 */
export function readChatConfig(env: Env = process.env): ChatConfig | null {
  if (env.CHAT_ENABLED?.trim().toLowerCase() === 'false') return null;
  const groqApiKey = env.GROQ_API_KEY?.trim();
  const databaseUrl = (env.DATABASE_URL ?? env.POSTGRES_URL)?.trim();
  const salt = (env.CHAT_SALT ?? env.SESSION_SECRET)?.trim();
  if (!groqApiKey || !databaseUrl || !salt || salt.length < MIN_SALT_LENGTH) return null;

  const listed = (env.CHAT_MODELS ?? '')
    .split(',')
    .map(m => m.trim())
    .filter(m => MODEL_ID.test(m));
  return {
    groqApiKey,
    models: listed.length ? [...new Set(listed)].slice(0, 4) : DEFAULT_MODELS,
    guardModel: env.CHAT_GUARD?.trim().toLowerCase() === 'off' ? null : GUARD_MODEL,
    databaseUrl,
    salt,
  };
}
