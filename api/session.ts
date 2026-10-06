import { defaultDeps, type Deps } from './_lib/deps.js';
import { errors, isSameOriginWrite, json, readJsonObject } from './_lib/http.js';
import { publicNames } from './_lib/names.js';
import { clearSessionCookie, createSessionCookie, readSession } from './_lib/session.js';

/** GET /api/session: who is signed in, and their best (0 when signed out). */
export async function handleGetSession(request: Request, deps: Deps): Promise<Response> {
  const { config } = deps;
  if (!config) return errors.notConfigured();
  const session = await readSession(request, config.sessionSecret);
  if (!session) return json({ player: null, best: 0 });
  try {
    const best = await deps.store(config).getBest(session.playerId);
    return json({ player: { firstName: session.firstName }, best });
  } catch {
    // The database being down shouldn't sign anyone out.
    return json({ player: { firstName: session.firstName }, best: 0 });
  }
}

/** POST /api/session { credential }: exchanges a Google ID token for our session cookie. */
export async function handleSignIn(request: Request, deps: Deps): Promise<Response> {
  const { config } = deps;
  if (!config) return errors.notConfigured();
  if (!isSameOriginWrite(request)) return errors.forbidden();
  const body = await readJsonObject(request);
  const credential = body?.credential;
  if (typeof credential !== 'string' || !credential || credential.length > 4096) return errors.badRequest();

  const identity = await deps.verifyGoogle(credential, config.googleClientId);
  if (!identity) return errors.unauthorized();

  const names = publicNames(identity);
  const session = { playerId: `google:${identity.sub}`, displayName: names.display, firstName: names.first };
  const cookie = await createSessionCookie(session, config.sessionSecret);
  let best = 0;
  try {
    best = await deps.store(config).getBest(session.playerId);
  } catch {
    /* signed in all the same */
  }
  return json({ player: { firstName: session.firstName }, best }, 200, { 'Set-Cookie': cookie });
}

/** DELETE /api/session: signs out of this browser. */
export async function handleSignOut(request: Request): Promise<Response> {
  if (!isSameOriginWrite(request)) return errors.forbidden();
  return json({ player: null, best: 0 }, 200, { 'Set-Cookie': clearSessionCookie() });
}

export const GET = (request: Request) => handleGetSession(request, defaultDeps());
export const POST = (request: Request) => handleSignIn(request, defaultDeps());
export const DELETE = (request: Request) => handleSignOut(request);
