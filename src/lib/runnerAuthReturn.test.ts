import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fakeSupabase } from '../test/fakeSupabase';

const getSupabase = vi.hoisted(() => vi.fn());
vi.mock('./supabase', () => ({ getSupabase }));

import { completeRunnerSignIn } from './runnerAuthReturn';

const start = window.location.href;

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
    cb(0);
    return 0;
  });
});
afterEach(() => {
  window.history.replaceState(null, '', start);
  vi.restoreAllMocks();
  getSupabase.mockReset();
});

describe('completeRunnerSignIn', () => {
  it('does nothing on a normal visit', async () => {
    window.history.replaceState(null, '', '/?code=abc#skills');
    const play = vi.fn();
    window.addEventListener('arcade:play', play);
    await completeRunnerSignIn();
    window.removeEventListener('arcade:play', play);
    expect(getSupabase).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?code=abc');
  });

  it('waits for the session, strips the auth params (keeping others) and reopens the game', async () => {
    const fake = fakeSupabase();
    getSupabase.mockResolvedValue(fake.client);
    window.history.replaceState(null, '', '/?keep=1&runner=1&code=abc');
    const play = vi.fn();
    window.addEventListener('arcade:play', play);
    await completeRunnerSignIn();
    window.removeEventListener('arcade:play', play);
    expect(fake.raw.auth.getSession).toHaveBeenCalled();
    expect(window.location.search).toBe('?keep=1');
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('a cancelled sign-in still lands in the game, with the error gone from the URL', async () => {
    getSupabase.mockRejectedValue(new Error('chunk failed'));
    window.history.replaceState(null, '', '/?runner=1&error=access_denied&error_description=nope#error=x');
    const play = vi.fn();
    window.addEventListener('arcade:play', play);
    await completeRunnerSignIn();
    window.removeEventListener('arcade:play', play);
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
    expect(play).toHaveBeenCalledTimes(1);
  });
});
