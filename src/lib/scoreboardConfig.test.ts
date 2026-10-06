import { describe, it, expect } from 'vitest';
import { googleClientId, isScoreboardConfigured } from './scoreboardConfig';

describe('googleClientId', () => {
  it('returns the trimmed client ID, or null when unset or blank', () => {
    expect(googleClientId({ VITE_GOOGLE_CLIENT_ID: ' abc.apps.googleusercontent.com ' })).toBe(
      'abc.apps.googleusercontent.com',
    );
    expect(googleClientId({})).toBeNull();
    expect(googleClientId({ VITE_GOOGLE_CLIENT_ID: '   ' })).toBeNull();
  });

  it('is off in the test build (no env var)', () => {
    expect(isScoreboardConfigured()).toBe(false);
  });
});
