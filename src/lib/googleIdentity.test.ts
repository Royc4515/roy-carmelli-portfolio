import { describe, it, expect, afterEach } from 'vitest';
import { loadGoogleIdentity, resetGoogleIdentityForTests, type GoogleAccountsId } from './googleIdentity';

const fakeId = { initialize() {}, renderButton() {}, disableAutoSelect() {} } as GoogleAccountsId;

afterEach(() => {
  delete window.google;
  document.head.querySelectorAll('script[src*="gsi/client"]').forEach(s => s.remove());
  resetGoogleIdentityForTests();
});

const script = () => document.head.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

describe('loadGoogleIdentity', () => {
  it('adds the script once and resolves with google.accounts.id', async () => {
    const a = loadGoogleIdentity();
    const b = loadGoogleIdentity();
    expect(document.head.querySelectorAll('script[src*="gsi/client"]')).toHaveLength(1);
    window.google = { accounts: { id: fakeId } };
    script()!.onload!(new Event('load'));
    await expect(a).resolves.toBe(fakeId);
    await expect(b).resolves.toBe(fakeId);
  });

  it('resolves at once when the API is already there', async () => {
    window.google = { accounts: { id: fakeId } };
    await expect(loadGoogleIdentity()).resolves.toBe(fakeId);
    expect(script()).toBeNull();
  });

  it('rejects on a load error (a blocker), removes the script, and lets the next call retry', async () => {
    const first = loadGoogleIdentity();
    script()!.onerror!(new Event('error'));
    await expect(first).rejects.toThrow(/failed to load/);
    expect(script()).toBeNull();
    loadGoogleIdentity();
    expect(script()).not.toBeNull();
  });

  it('rejects when the script loads without the API', async () => {
    const p = loadGoogleIdentity();
    script()!.onload!(new Event('load'));
    await expect(p).rejects.toThrow(/without its API/);
  });
});
