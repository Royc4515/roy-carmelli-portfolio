import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

// Google's signing keys, fetched once per warm instance and cached by jose.
let googleKeys: JWTVerifyGetKey | null = null;
function keys(): JWTVerifyGetKey {
  googleKeys ??= createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  return googleKeys;
}

export interface GoogleIdentity {
  sub: string;
  given_name?: unknown;
  family_name?: unknown;
  name?: unknown;
}

/**
 * Verifies a "Sign in with Google" ID token: Google's signature, issuer, expiry, and that it
 * was issued to THIS site's client ID (a token minted for another app is rejected).
 * Resolves to `null` for anything that fails.
 */
export async function verifyGoogleIdToken(
  token: string,
  clientId: string,
  getKey: JWTVerifyGetKey = keys(),
): Promise<GoogleIdentity | null> {
  try {
    const { payload } = await jwtVerify(token, getKey, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return payload as GoogleIdentity;
  } catch {
    return null;
  }
}
