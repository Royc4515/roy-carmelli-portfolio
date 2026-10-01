import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

type AuthListener = (event: string, session: { user: unknown } | null) => void;

/**
 * Just enough of a SupabaseClient for the scoreboard: `auth` (session, listener, OAuth,
 * sign-out) and `rpc`, whose answers each test sets per function name.
 */
export function fakeSupabase(opts: { user?: unknown } = {}) {
  let session: { user: unknown } | null = opts.user ? { user: opts.user } : null;
  const listeners = new Set<AuthListener>();
  const rpcResults: Record<string, { data?: unknown; error?: unknown }> = {
    start_runner_run: { data: null },
    submit_runner_score: { data: 0 },
    my_runner_best: { data: 0 },
    runner_leaderboard: { data: [] },
  };

  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
      onAuthStateChange: vi.fn((cb: AuthListener) => {
        listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      }),
      signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => {
        session = null;
        listeners.forEach(cb => cb('SIGNED_OUT', null));
        return { error: null };
      }),
    },
    rpc: vi.fn(async (fn: string, _args?: unknown) => ({
      data: rpcResults[fn]?.data ?? null,
      error: rpcResults[fn]?.error ?? null,
    })),
  };

  return {
    client: client as unknown as SupabaseClient,
    raw: client,
    setRpc(fn: string, result: { data?: unknown; error?: unknown }) {
      rpcResults[fn] = result;
    },
    signInAs(user: unknown) {
      session = { user };
      listeners.forEach(cb => cb('SIGNED_IN', session));
    },
  };
}
