import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useIsMobile } from './useIsMobile';

// Factory that creates a matchMedia mock for a given viewport width
function createMatchMediaMock(width: number) {
  return (query: string) => {
    // Parse "(max-width: 767px)" — the exact query the hook uses
    const match = query.match(/max-width:\s*(\d+)px/);
    const breakpoint = match ? parseInt(match[1], 10) : 0;
    const matches = width <= breakpoint;

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList;
  };
}

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when viewport is 375px (mobile)', () => {
    window.matchMedia = createMatchMediaMock(375);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns true at exactly 767px (upper mobile boundary)', () => {
    window.matchMedia = createMatchMediaMock(767);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false at exactly 768px (desktop breakpoint)', () => {
    window.matchMedia = createMatchMediaMock(768);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns false at 1440px (large desktop)', () => {
    window.matchMedia = createMatchMediaMock(1440);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('updates reactively when the media query fires a change event', () => {
    // Start at desktop
    let capturedListener: ((e: MediaQueryListEvent) => void) | null = null;
    let currentMatches = false;

    window.matchMedia = (_query: string) => ({
      matches: currentMatches,
      media: _query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: EventListenerOrEventListenerObject) => {
        capturedListener = cb as (e: MediaQueryListEvent) => void;
      },
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate crossing the breakpoint (resize to mobile)
    act(() => {
      currentMatches = true;
      capturedListener?.({ matches: true } as MediaQueryListEvent);
    });

    expect(result.current).toBe(true);
  });

  it('removes the event listener on unmount', () => {
    const removeEventListener = vi.fn();
    window.matchMedia = (_query: string) => ({
      matches: false,
      media: _query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener,
      dispatchEvent: vi.fn(),
    } as MediaQueryList);

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(removeEventListener).toHaveBeenCalledOnce();
  });
});
