// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet } from 'jose';
import { publicNames } from '../_lib/names.js';
import { MAX_SCORE, POINTS_PER_SECOND, maxPlausibleScore, parseScore } from '../_lib/scoring.js';
import { verifyGoogleIdToken } from '../_lib/google.js';
import { SCORE_CONFIG } from '../../src/components/MiniGame/config';
import { CLIENT_ID } from './fakes.js';

describe('publicNames', () => {
  it('is "First L." from the Google claims', () => {
    expect(publicNames({ given_name: 'Roy', family_name: 'Carmelli' })).toEqual({ display: 'Roy C.', first: 'Roy' });
    expect(publicNames({ name: 'רועי בן דוד כרמלי' })).toEqual({ display: 'רועי כ.', first: 'רועי' });
    expect(publicNames({ given_name: 'Madonna' })).toEqual({ display: 'Madonna', first: 'Madonna' });
    expect(publicNames({})).toEqual({ display: 'Player', first: 'Player' });
  });

  it('strips bidi overrides, zero-width and control characters', () => {
    const sneaky = 'R‮oy​\u0000';
    expect(publicNames({ given_name: sneaky, family_name: '⁦Carmelli' })).toEqual({ display: 'Roy C.', first: 'Roy' });
    expect(publicNames({ given_name: '​‮', name: '' })).toEqual({ display: 'Player', first: 'Player' });
  });

  it('caps the first name at 24 characters without splitting a code point', () => {
    const long = '😀'.repeat(30);
    expect(Array.from(publicNames({ given_name: long }).first)).toHaveLength(24);
  });
});

describe('scoring', () => {
  it('matches the game\'s points per second', () => {
    expect(POINTS_PER_SECOND).toBe(SCORE_CONFIG.pointsPerSecond);
  });

  it('allows what an honest run can score, with slack, and nothing for a bad clock', () => {
    expect(maxPlausibleScore(60)).toBe(Math.floor(60 * 8 * 1.05) + 24);
    expect(maxPlausibleScore(0)).toBe(24);
    expect(maxPlausibleScore(-5)).toBe(0);
    expect(maxPlausibleScore(NaN)).toBe(0);
  });

  it('parses only whole scores in range', () => {
    expect(parseScore(0)).toBe(0);
    expect(parseScore(MAX_SCORE)).toBe(MAX_SCORE);
    for (const bad of [-1, MAX_SCORE + 1, 1.5, NaN, '5', null]) expect(parseScore(bad)).toBeNull();
  });
});

describe('verifyGoogleIdToken', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' }] });
  const token = (claims: { iss?: string; aud?: string; exp?: string; sub?: string } = {}) =>
    new SignJWT({ name: 'Roy Carmelli' })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(claims.iss ?? 'https://accounts.google.com')
      .setAudience(claims.aud ?? CLIENT_ID)
      .setSubject(claims.sub ?? '42')
      .setIssuedAt()
      .setExpirationTime(claims.exp ?? '1h')
      .sign(privateKey);

  it('accepts a token Google issued to this client', async () => {
    expect(await verifyGoogleIdToken(await token(), CLIENT_ID, jwks)).toMatchObject({ sub: '42', name: 'Roy Carmelli' });
    expect(await verifyGoogleIdToken(await token({ iss: 'accounts.google.com' }), CLIENT_ID, jwks)).not.toBeNull();
  });

  it('rejects another app\'s token, another issuer, an expired token and a foreign signature', async () => {
    expect(await verifyGoogleIdToken(await token({ aud: 'other-app' }), CLIENT_ID, jwks)).toBeNull();
    expect(await verifyGoogleIdToken(await token({ iss: 'https://evil.example' }), CLIENT_ID, jwks)).toBeNull();
    expect(await verifyGoogleIdToken(await token({ exp: '-1m' }), CLIENT_ID, jwks)).toBeNull();
    const other = await generateKeyPair('RS256');
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer('https://accounts.google.com')
      .setAudience(CLIENT_ID)
      .setSubject('42')
      .setExpirationTime('1h')
      .sign(other.privateKey);
    expect(await verifyGoogleIdToken(forged, CLIENT_ID, jwks)).toBeNull();
    expect(await verifyGoogleIdToken('not-a-jwt', CLIENT_ID, jwks)).toBeNull();
  });
});
