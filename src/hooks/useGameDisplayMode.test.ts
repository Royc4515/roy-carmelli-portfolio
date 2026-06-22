import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameDisplayMode } from './useGameDisplayMode';

/**
 * Builds a matchMedia mock answering the three queries the hook cares about:
 *  - `(pointer: coarse)`        → `coarse`
 *  - `(orientation: portrait)`  → `portrait`
 *  - `(max-width: 767px)`       → `narrow` (phone-sized; defaults to `coarse`)
 */
function createMatchMediaMock(coarse: boolean, portrait: boolean, narrow = coarse) {
  return (query: string) => {
    let matches = false;
    if (query.includes('pointer: coarse')) matches = coarse;
    else if (query.includes('orientation: portrait')) matches = portrait;
    else if (query.includes('max-width')) matches = narrow;

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

describe('useGameDisplayMode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "desktop" when pointer is fine, regardless of orientation', () => {
    window.matchMedia = createMatchMediaMock(false, true);
    const { result } = renderHook(() => useGameDisplayMode());
    expect(result.current).toBe('desktop');
  });

  it('returns "rotate" on a coarse pointer in portrait', () => {
    window.matchMedia = createMatchMediaMock(true, true);
    const { result } = renderHook(() => useGameDisplayMode());
    expect(result.current).toBe('rotate');
  });

  it('returns "touch" on a coarse pointer in landscape', () => {
    window.matchMedia = createMatchMediaMock(true, false);
    const { result } = renderHook(() => useGameDisplayMode());
    expect(result.current).toBe('touch');
  });

  it('returns "touch" on a coarse-pointer tablet in portrait (wide enough to play)', () => {
    // coarse + portrait but NOT narrow (≥768px) → playable, not a rotate prompt
    window.matchMedia = createMatchMediaMock(true, true, false);
    const { result } = renderHook(() => useGameDisplayMode());
    expect(result.current).toBe('touch');
  });

  it('updates reactively when orientation changes (rotate → touch)', () => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = [];
    let portrait = true;

    window.matchMedia = (query: string) => ({
      matches: query.includes('pointer: coarse')
        ? true
        : query.includes('orientation: portrait')
          ? portrait
          : query.includes('max-width')
            ? true // phone-sized
            : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: EventListenerOrEventListenerObject) => {
        listeners.push(cb as (e: MediaQueryListEvent) => void);
      },
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList);

    const { result } = renderHook(() => useGameDisplayMode());
    expect(result.current).toBe('rotate');

    // User rotates to landscape
    act(() => {
      portrait = false;
      listeners.forEach(cb => cb({ matches: false } as MediaQueryListEvent));
    });

    expect(result.current).toBe('touch');
  });

  it('removes its listeners on unmount', () => {
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

    const { unmount } = renderHook(() => useGameDisplayMode());
    unmount();

    // One per query (coarse + portrait + max-width)
    expect(removeEventListener).toHaveBeenCalledTimes(3);
  });
});
