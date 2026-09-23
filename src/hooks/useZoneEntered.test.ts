import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useZoneEntered, resetZoneEntered } from './useZoneEntered';

// One shared observer: the test reports entries through it by hand.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  readonly observed: Element[] = [];
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.observed.splice(this.observed.indexOf(el), 1);
  }
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const IDS = ['projects', 'about', 'skills', 'resume', 'contact'];
const originalIO = window.IntersectionObserver;
const originalMatchMedia = window.matchMedia;

function setReducedMotion(reduce: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

/** A section with its zone H2, the way ZoneHeader renders it. */
function addZone(id: string) {
  const section = document.createElement('section');
  section.id = id;
  const heading = document.createElement('h2');
  heading.id = `${id}-title`;
  section.append(heading);
  document.body.append(section);
}

const observer = () => MockIntersectionObserver.instances.at(-1)!;

/** Report each zone H2 as above (true) or below (false) the 35% line, in one callback. */
function report(states: Record<string, boolean>, bottom = 200) {
  const entries = Object.entries(states).map(([id, above]) => ({
    target: document.getElementById(`${id}-title`)!,
    isIntersecting: above,
    boundingClientRect: { top: bottom - 40, bottom } as DOMRectReadOnly,
  })) as unknown as IntersectionObserverEntry[];
  act(() => observer().callback(entries, observer() as unknown as IntersectionObserver));
}

/** The user touches the wheel: banners are armed from here on. */
const userScrolls = () => act(() => void window.dispatchEvent(new Event('wheel')));

function renderZones() {
  return Object.fromEntries(IDS.map(id => [id, renderHook(() => useZoneEntered(`${id}-title`))]));
}

function clickLink(href: string) {
  const link = document.createElement('a');
  link.href = href;
  document.body.append(link);
  act(() => link.click());
  link.remove();
}

describe('useZoneEntered', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    setReducedMotion(false);
    IDS.forEach(addZone);
  });

  afterEach(() => {
    resetZoneEntered();
    window.IntersectionObserver = originalIO;
    window.matchMedia = originalMatchMedia;
    document.body.innerHTML = '';
  });

  it('watches the headings against the viewport above a line at 35%', () => {
    renderZones();
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(observer().options.rootMargin).toBe('100000px 0px -65% 0px');
    expect(observer().observed.map(el => el.id)).toEqual(IDS.map(id => `${id}-title`));
  });

  it('fires once when the heading crosses the line while scrolling down', () => {
    const zones = renderZones();
    report({ projects: false, about: false });
    userScrolls();
    report({ projects: true });
    expect(zones.projects.result.current).toBe(true);
    expect(zones.about.result.current).toBe(false);

    // Back up and down again: still entered, and it no longer watches.
    expect(observer().observed.map(el => el.id)).not.toContain('projects-title');
    report({ about: true });
    expect(zones.about.result.current).toBe(true);
  });

  it('never fires on load for a zone already past the line', () => {
    const zones = renderZones();
    report({ projects: true, about: false });
    userScrolls();
    report({ projects: true });
    expect(zones.projects.result.current).toBe(false);
  });

  it('ignores crossings before any user input (scroll restoration on reload)', () => {
    const zones = renderZones();
    report({ projects: false });
    report({ projects: true });
    expect(zones.projects.result.current).toBe(false);
  });

  it('ignores a heading that was jumped past (already above the viewport)', () => {
    const zones = renderZones();
    report({ projects: false });
    userScrolls();
    report({ projects: true }, -20);
    expect(zones.projects.result.current).toBe(false);
  });

  it('announces only the lowest zone when several cross in one report', () => {
    const zones = renderZones();
    report({ projects: false, about: false, skills: false });
    userScrolls();
    report({ projects: true, about: true, skills: true });
    expect(zones.projects.result.current).toBe(false);
    expect(zones.about.result.current).toBe(false);
    expect(zones.skills.result.current).toBe(true);
  });

  it('announces only the destination of a nav jump across several zones', () => {
    const zones = renderZones();
    report({ projects: false, about: false, skills: false, resume: false, contact: false });
    clickLink('#contact');
    // The smooth scroll passes each heading in turn.
    ['projects', 'about', 'skills', 'resume'].forEach(id => report({ [id]: true }));
    report({ contact: true });
    expect(IDS.map(id => zones[id].result.current)).toEqual([false, false, false, false, true]);
  });

  it('still announces an adjacent zone reached from the nav', () => {
    const zones = renderZones();
    report({ projects: false, about: false });
    clickLink('#projects');
    report({ projects: true });
    expect(zones.projects.result.current).toBe(true);
  });

  it('respects reduced motion: no observer, never entered', () => {
    setReducedMotion(true);
    const zones = renderZones();
    expect(MockIntersectionObserver.instances).toHaveLength(0);
    userScrolls();
    expect(zones.projects.result.current).toBe(false);
  });

  it('is false without IntersectionObserver or a matching element', () => {
    window.IntersectionObserver = undefined as unknown as typeof IntersectionObserver;
    expect(renderHook(() => useZoneEntered('projects-title')).result.current).toBe(false);
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    expect(renderHook(() => useZoneEntered('missing')).result.current).toBe(false);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });
});
