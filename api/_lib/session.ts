import { SignJWT, jwtVerify } from 'jose';
import { readCookie } from './http.js';

// don't touch / __Host- makes the browser refuse the cookie unless it is Secure, Path=/ and
// has no Domain, so no other subdomain can plant or read it.
export const SESSION_COOKIE = '__Host-rr_session';
const SESSION_DAYS = 30;
const ISSUER = 'roy-runner';

export interface Session {
  /** "google:<sub>": stable per Google account, never shown. */
  playerId: string;
  /** "Roy C." */
  displayName: string;
  /** "Roy" */
  firstName: string;
}

export async function createSessionCookie(session: Session, secret: Uint8Array): Promise<string> {
  const token = await new SignJWT({ dn: session.displayName, fn: session.firstName })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.playerId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

/** The request's session, or `null` when there is none or it is forged, expired or malformed. */
export async function readSession(request: Request, secret: Uint8Array): Promise<Session | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, algorithms: ['HS256'] });
    const { sub, dn, fn } = payload;
    if (typeof sub !== 'string' || typeof dn !== 'string' || typeof fn !== 'string') return null;
    return { playerId: sub, displayName: dn, firstName: fn };
  } catch {
    return null;
  }
}
