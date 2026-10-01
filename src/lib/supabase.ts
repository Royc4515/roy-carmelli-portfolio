import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  key: string;
}

type EnvLike = Partial<Record<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY', string | undefined>>;

/**
 * The project URL and publishable (anon) key, or `null` when either is missing or the URL is
 * not https. Without them the scoreboard switches off and the game keeps a local best only,
 * so a fork or a preview deploy with no env vars still works.
 */
export function readSupabaseConfig(env: EnvLike = import.meta.env): SupabaseConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  try {
    if (new URL(url).protocol !== 'https:') return null;
  } catch {
    return null;
  }
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseConfig() !== null;
}

let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * One shared client, created on first use. supabase-js is imported dynamically so its ~50KB
 * only loads with the game (or on the way back from Google), never with the page itself.
 * Resolves to `null` when the scoreboard is not configured or the chunk fails to load.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!clientPromise) {
    const config = readSupabaseConfig();
    clientPromise = config
      ? import('@supabase/supabase-js')
          .then(({ createClient }) =>
            createClient(config.url, config.key, {
              // PKCE returns `?code=` instead of tokens in the hash, which useInitialHashScroll
              // would otherwise treat as a section id.
              auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true },
            }),
          )
          .catch(() => {
            clientPromise = null; // let a later call retry (e.g. back online)
            return null;
          })
      : Promise.resolve(null);
  }
  return clientPromise;
}

/** Test hook: forget the cached client. */
export function resetSupabaseForTests(): void {
  clientPromise = null;
}
