import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type Listener = (e: MediaQueryListEvent) => void;

// matchMedia mock that answers the reduced-motion query and records its listener.
function mockMatchMedia(initial: boolean) {
  const state = { matches: initial, listener: null as Listener | null };
  const addEventListener = vi.fn((_: string, cb: EventListenerOrEventListenerObject) => {
    state.listener = cb as Listener;
  });
  const removeEventListener = vi.fn();
  const queries: string[] = [];

  window.matchMedia = (query: string) => {
    queries.push(query);
    return {
      matches: query === '(prefers-reduced-motion: reduce)' ? state.matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener,
      removeEventListener,
      dispatchEvent: vi.fn(),
    } as MediaQueryList;
  };

  return { state, addEventListener, removeEventListener, queries };
}

const originalMatchMedia = window.matchMedia;

describe('usePrefersReducedMotion', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('returns false when the user has no motion preference', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when the user prefers reduced motion', () => {
    const { queries } = mockMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
    expect(queries).toContain('(prefers-reduced-motion: reduce)');
  });

  it('updates when the preference changes', () => {
    const { state } = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      state.matches = true;
      state.listener?.({ matches: true } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);

    act(() => {
      state.matches = false;
      state.listener?.({ matches: false } as MediaQueryListEvent);
    });
    expect(result.current).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const { addEventListener, removeEventListener } = mockMatchMedia(false);
    const { unmount } = renderHook(() => usePrefersReducedMotion());
    expect(addEventListener).toHaveBeenCalledOnce();
    unmount();
    expect(removeEventListener).toHaveBeenCalledOnce();
    expect(removeEventListener.mock.calls[0][1]).toBe(addEventListener.mock.calls[0][1]);
  });

  it('falls back to false when matchMedia is unavailable', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });
});
