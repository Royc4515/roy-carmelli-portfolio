import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useInitialHashScroll } from './useInitialHashScroll';

describe('useInitialHashScroll', () => {
  let target: HTMLElement;
  let scrollIntoView: ReturnType<typeof vi.fn>;
  let resolveFonts: () => void;

  beforeEach(() => {
    target = document.createElement('section');
    target.id = 'skills';
    document.body.append(target);
    scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView as unknown as typeof target.scrollIntoView;
    const ready = new Promise<void>(resolve => {
      resolveFonts = resolve;
    });
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
  });

  afterEach(() => {
    target.remove();
    window.history.replaceState(null, '', '/');
    delete (document as { fonts?: unknown }).fonts;
  });

  it('jumps to the hashed section after the first render and again once fonts settle', async () => {
    window.history.replaceState(null, '', '/#skills');
    renderHook(() => useInitialHashScroll());
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
    resolveFonts();
    await Promise.resolve();
    await Promise.resolve();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('does not re-jump after the visitor starts scrolling', async () => {
    window.history.replaceState(null, '', '/#skills');
    renderHook(() => useInitialHashScroll());
    window.dispatchEvent(new Event('wheel'));
    resolveFonts();
    await Promise.resolve();
    await Promise.resolve();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a hash or with an unknown or malformed one', () => {
    renderHook(() => useInitialHashScroll());
    window.history.replaceState(null, '', '/#nowhere');
    renderHook(() => useInitialHashScroll());
    window.history.replaceState(null, '', '/#%E0%A4%A');
    expect(() => renderHook(() => useInitialHashScroll())).not.toThrow();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
