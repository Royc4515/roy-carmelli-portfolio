import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useTheme,
  getInitialTheme,
  THEME_ANIM_CLASS,
  THEME_ANIM_MS,
  THEME_STORAGE_KEY,
} from './useTheme';

const root = document.documentElement;
const originalMatchMedia = window.matchMedia;

function mockOsDark(dark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? dark : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function reset() {
  root.removeAttribute('data-theme');
  root.classList.remove(THEME_ANIM_CLASS);
  window.localStorage.clear();
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
  vi.useRealTimers();
}

describe('useTheme', () => {
  beforeEach(reset);
  afterEach(reset);

  it('starts from the data-theme attribute set by the inline script', () => {
    root.setAttribute('data-theme', 'night');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'day');
    mockOsDark(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('night');
    expect(root.dataset.theme).toBe('night');
  });

  it('falls back to the stored choice, then the OS preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'night');
    mockOsDark(false);
    expect(getInitialTheme()).toBe('night');

    window.localStorage.clear();
    mockOsDark(true);
    expect(getInitialTheme()).toBe('night');

    mockOsDark(false);
    expect(getInitialTheme()).toBe('day');
  });

  it('ignores an invalid attribute or stored value', () => {
    root.setAttribute('data-theme', 'dusk');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dusk');
    mockOsDark(true);
    expect(getInitialTheme()).toBe('night');
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    mockOsDark(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('night');
    act(() => result.current[1]());
    expect(result.current[0]).toBe('day');
    expect(root.dataset.theme).toBe('day');
  });

  it('never animates on load', () => {
    root.setAttribute('data-theme', 'night');
    renderHook(() => useTheme());
    expect(root.classList.contains(THEME_ANIM_CLASS)).toBe(false);
  });

  it('toggle flips, persists and cross-fades for one transition only', () => {
    vi.useFakeTimers();
    root.setAttribute('data-theme', 'day');
    const { result } = renderHook(() => useTheme());

    act(() => result.current[1]());
    expect(result.current[0]).toBe('night');
    expect(root.dataset.theme).toBe('night');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
    expect(root.classList.contains(THEME_ANIM_CLASS)).toBe(true);

    act(() => vi.advanceTimersByTime(THEME_ANIM_MS - 1));
    expect(root.classList.contains(THEME_ANIM_CLASS)).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(root.classList.contains(THEME_ANIM_CLASS)).toBe(false);
  });

  it('restarts the cross-fade window on rapid toggles and cleans up on unmount', () => {
    vi.useFakeTimers();
    root.setAttribute('data-theme', 'day');
    const { result, unmount } = renderHook(() => useTheme());

    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current[1]());
    expect(result.current[0]).toBe('day');
    act(() => vi.advanceTimersByTime(300));
    expect(root.classList.contains(THEME_ANIM_CLASS)).toBe(true);

    unmount();
    expect(root.classList.contains(THEME_ANIM_CLASS)).toBe(false);
  });
});

// The pre-paint script lives in index.html; run it here against jsdom so its
// fallbacks stay in step with getInitialTheme.
describe('index.html theme script', () => {
  const html = readFileSync(resolve(import.meta.dirname, '../../index.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  const run = () => new Function(match![1])();

  beforeEach(reset);
  afterEach(reset);

  it('is a plain inline script placed before any stylesheet', () => {
    expect(match).not.toBeNull();
    const scriptAt = html.indexOf('<script>');
    const firstStyle = Math.min(
      ...['<style', 'rel="stylesheet"', '<script type="module"']
        .map(s => html.indexOf(s))
        .filter(i => i >= 0)
    );
    expect(scriptAt).toBeLessThan(firstStyle);
  });

  it('applies the stored theme', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'night');
    mockOsDark(false);
    run();
    expect(root.dataset.theme).toBe('night');
  });

  it('uses the OS preference when nothing valid is stored', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dusk');
    mockOsDark(true);
    run();
    expect(root.dataset.theme).toBe('night');
  });

  it('defaults to day when storage and matchMedia both fail', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    run();
    expect(root.dataset.theme).toBe('day');
  });
});
