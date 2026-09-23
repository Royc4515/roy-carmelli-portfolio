import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useActiveSection, pickActiveSection } from './useActiveSection';

type Callback = IntersectionObserverCallback;

// Records every observer so the test can fire its callback by hand.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  readonly observed: Element[] = [];
  disconnected = false;

  constructor(
    readonly callback: Callback,
    readonly options: IntersectionObserverInit = {},
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  fire() {
    this.callback([], this as unknown as IntersectionObserver);
  }
}

const tops: Record<string, number> = {};

function addSection(id: string) {
  const el = document.createElement('section');
  el.id = id;
  el.getBoundingClientRect = () => ({ top: tops[id] }) as DOMRect;
  document.body.append(el);
}

// jsdom's innerHeight is 768, so the 30% line sits at 230.4px.
function scrollTo(positions: Record<string, number>) {
  Object.assign(tops, positions);
  act(() => MockIntersectionObserver.instances.at(-1)!.fire());
}

const originalIO = window.IntersectionObserver;
const IDS = ['projects', 'about', 'skills'];

describe('useActiveSection', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    Object.assign(tops, { projects: 800, about: 1600, skills: 2400 });
    IDS.forEach(addSection);
  });

  afterEach(() => {
    window.IntersectionObserver = originalIO;
    document.body.innerHTML = '';
  });

  it('is null while every section is below the line (hero on screen)', () => {
    const { result } = renderHook(() => useActiveSection(IDS));
    expect(result.current).toBeNull();
  });

  it('observes each section against a zero-height root at 30% of the viewport', () => {
    renderHook(() => useActiveSection(IDS));
    const io = MockIntersectionObserver.instances.at(-1)!;
    expect(io.options.rootMargin).toBe('-30% 0px -70% 0px');
    expect(io.observed.map(el => el.id)).toEqual(IDS);
  });

  it('returns the section whose top is nearest above the line as sections cross it', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    scrollTo({ projects: 200, about: 1000, skills: 1800 });
    expect(result.current).toBe('projects');

    scrollTo({ projects: -700, about: 100, skills: 900 });
    expect(result.current).toBe('about');

    scrollTo({ projects: -1600, about: -800, skills: 230 });
    expect(result.current).toBe('skills');

    // Back up above the first section.
    scrollTo({ projects: 500, about: 1300, skills: 2100 });
    expect(result.current).toBeNull();
  });

  it('honours a custom offset', () => {
    const { result } = renderHook(() => useActiveSection(IDS, { offset: 0.5 }));
    expect(MockIntersectionObserver.instances.at(-1)!.options.rootMargin).toBe('-50% 0px -50% 0px');
    scrollTo({ projects: 380, about: 1200, skills: 2000 });
    expect(result.current).toBe('projects');
  });

  it('skips ids that are not in the document', () => {
    const { result } = renderHook(() => useActiveSection(['missing', ...IDS]));
    expect(MockIntersectionObserver.instances.at(-1)!.observed).toHaveLength(3);
    scrollTo({ projects: 0 });
    expect(result.current).toBe('projects');
  });

  it('does not re-subscribe when given a new array with the same ids', () => {
    const { rerender } = renderHook(({ ids }) => useActiveSection(ids), {
      initialProps: { ids: [...IDS] },
    });
    rerender({ ids: [...IDS] });
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useActiveSection(IDS));
    const io = MockIntersectionObserver.instances.at(-1)!;
    unmount();
    expect(io.disconnected).toBe(true);
  });

  it('returns null without IntersectionObserver', () => {
    window.IntersectionObserver = undefined as unknown as typeof IntersectionObserver;
    const { result } = renderHook(() => useActiveSection(IDS));
    expect(result.current).toBeNull();
  });
});

describe('pickActiveSection', () => {
  const el = (id: string, top: number) =>
    ({ id, getBoundingClientRect: () => ({ top }) as DOMRect }) as HTMLElement;

  it('picks the greatest top at or above the line, regardless of order', () => {
    expect(pickActiveSection([el('b', -50), el('a', -900), el('c', 400)], 230)).toBe('b');
  });

  it('counts a top exactly on the line as above it', () => {
    expect(pickActiveSection([el('a', -10), el('b', 230)], 230)).toBe('b');
  });

  it('is null for an empty list', () => {
    expect(pickActiveSection([], 230)).toBeNull();
  });
});
