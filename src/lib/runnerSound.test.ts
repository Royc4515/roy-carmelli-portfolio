import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SOUND_STORAGE_KEY, isRunnerMuted, setRunnerMuted, subscribeRunnerMuted, toggleRunnerMuted,
} from './runnerSound';

beforeEach(() => {
  setRunnerMuted(false);
  window.localStorage.clear();
});

describe('runnerSound', () => {
  it('defaults to sound on', () => {
    expect(isRunnerMuted()).toBe(false);
  });

  it('remembers the choice and tells subscribers once per change', () => {
    const fn = vi.fn();
    const unsubscribe = subscribeRunnerMuted(fn);
    toggleRunnerMuted();
    expect(isRunnerMuted()).toBe(true);
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off');
    setRunnerMuted(true); // no change, no call
    expect(fn).toHaveBeenCalledTimes(1);
    unsubscribe();
    toggleRunnerMuted();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('on');
  });

  it('reads a stored choice on first use', async () => {
    window.localStorage.setItem(SOUND_STORAGE_KEY, 'off');
    vi.resetModules();
    const fresh = await import('./runnerSound');
    expect(fresh.isRunnerMuted()).toBe(true);
  });

  it('still switches when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    toggleRunnerMuted();
    expect(isRunnerMuted()).toBe(true);
    spy.mockRestore();
  });
});
