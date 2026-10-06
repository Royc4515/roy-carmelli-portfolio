import { act, renderHook } from '@testing-library/react';
import { MAX_TYPE_MS, typeDuration, useTypewriter } from './useTypewriter';

/** A hand-driven requestAnimationFrame: each `step(ms)` advances the clock one frame. */
function manualFrames() {
  let now = 0;
  let queue: FrameRequestCallback[] = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
    queue.push(cb);
    return queue.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  return {
    step(ms: number) {
      now += ms;
      const run = queue;
      queue = [];
      act(() => run.forEach(cb => cb(now)));
    },
  };
}

function reducedMotion(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error jsdom has no matchMedia by default
  delete window.matchMedia;
});

describe('typeDuration', () => {
  it('types short lines at a steady pace and caps long ones', () => {
    expect(typeDuration(30)).toBe(500);
    expect(typeDuration(700)).toBe(MAX_TYPE_MS);
  });
});

describe('useTypewriter', () => {
  it('reveals the text over time and finishes within the cap', () => {
    const frames = manualFrames();
    const text = 'x'.repeat(600);
    const { result } = renderHook(() => useTypewriter(text, true));
    expect(result.current).toEqual({ shown: '', done: false });
    frames.step(0);
    frames.step(MAX_TYPE_MS / 2);
    expect(result.current.shown.length).toBeGreaterThan(200);
    expect(result.current.done).toBe(false);
    frames.step(MAX_TYPE_MS / 2);
    expect(result.current).toEqual({ shown: text, done: true });
  });

  it('shows everything at once when not animated or under reduced motion', () => {
    expect(renderHook(() => useTypewriter('Hello', false)).result.current).toEqual({ shown: 'Hello', done: true });
    reducedMotion(true);
    expect(renderHook(() => useTypewriter('Hello', true)).result.current).toEqual({ shown: 'Hello', done: true });
  });

  it('finishes when the skip counter moves', () => {
    manualFrames();
    const { result, rerender } = renderHook(({ skip }) => useTypewriter('Hello there', true, skip), { initialProps: { skip: 0 } });
    expect(result.current.done).toBe(false);
    rerender({ skip: 1 });
    expect(result.current).toEqual({ shown: 'Hello there', done: true });
  });

  it('never splits a Hebrew letter or an emoji', () => {
    const frames = manualFrames();
    const { result } = renderHook(() => useTypewriter('שלום \u{1F600} עולם', true));
    for (let i = 0; i < 20 && !result.current.done; i++) {
      frames.step(16);
      expect(result.current.shown).not.toMatch(/[\uD800-\uDBFF]$/);
    }
    expect(result.current.done).toBe(true);
  });
});
