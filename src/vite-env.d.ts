/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL (Roy Runner scoreboard). Optional: unset turns the scoreboard off. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (anon) key. Public by design; RLS + the SQL functions guard the data. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
