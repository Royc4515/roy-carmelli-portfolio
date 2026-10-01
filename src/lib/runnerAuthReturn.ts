import { AUTH_RETURN_PARAM } from './runnerScores';
import { getSupabase } from './supabase';

/** Params the OAuth round trip can leave in the URL (ours, PKCE's, and the error report). */
const RETURN_PARAMS = [AUTH_RETURN_PARAM, 'code', 'error', 'error_code', 'error_description'];

/**
 * Called once at startup. When the visit is the way back from Google sign-in (our marker param
 * is present), loads the client so it can exchange the `?code=` for a session, removes every
 * auth param from the address bar, and reopens Roy Runner, where the player left it.
 *
 * A cancelled or failed sign-in comes back with `?error=...` and still lands in the game,
 * signed out, rather than on a page with error text in its URL.
 */
export async function completeRunnerSignIn(win: Window = window): Promise<void> {
  const url = new URL(win.location.href);
  if (!url.searchParams.has(AUTH_RETURN_PARAM)) return;

  try {
    const client = await getSupabase();
    // getSession waits for the client's startup, which is when it exchanges the code.
    await client?.auth.getSession();
  } catch {
    /* signed out it is */
  }

  const clean = new URL(win.location.href); // the client may have edited it meanwhile
  for (const p of RETURN_PARAMS) clean.searchParams.delete(p);
  // Some error redirects report in the hash instead; never leave "#error=..." behind.
  if (/^#error/.test(clean.hash)) clean.hash = '';
  win.history.replaceState(win.history.state, '', clean.toString());

  // A frame later, so Hero's `arcade:play` listener is surely mounted.
  win.requestAnimationFrame(() => win.dispatchEvent(new CustomEvent('arcade:play')));
}
