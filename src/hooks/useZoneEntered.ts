import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** The "zone entered" line, as a fraction of the viewport height from the top. */
export const ZONE_ENTERED_LINE = 0.35;

/** A nav jump that spans more than this many zones announces only its destination. */
const MAX_ANNOUNCED_STEP = 1;
/** A jump is over once the page has stopped scrolling for this long (no `scrollend`). */
const SCROLL_IDLE_MS = 160;
/** Safety net: a jump never suppresses banners for longer than this. */
const JUMP_TIMEOUT_MS = 3000;

/**
 * The IntersectionObserver root is the viewport above the 35% line, stretched far upwards,
 * so "intersecting" means "the element's top is above the line". A false → true change is
 * the element crossing the line while the page scrolls down; true → false is scrolling back.
 */
const ROOT_MARGIN = `100000px 0px -${Math.round((1 - ZONE_ENTERED_LINE) * 100)}% 0px`;

/** User input that arms the banners: scroll restoration on reload is not the user scrolling. */
const ARMING_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'click'] as const;

interface Zone {
  id: string;
  el: Element;
  /** Above the line after the last report; `null` until the observer's first report. */
  above: boolean | null;
  enter: () => void;
}

// Module state: one observer and one set of listeners for every zone on the page.
const zones = new Map<Element, Zone>();
const fired = new Set<string>();
let observer: IntersectionObserver | null = null;
let armed = false;
/** During a multi-zone nav jump: the zone index it lands in (only that zone may announce). */
let jumpTarget: number | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

/** Zones in document order. */
function ordered(): Zone[] {
  return Array.from(zones.values()).sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
}

/** Index of the last zone above the line (-1 above the first zone, e.g. on the hero). */
function currentIndex(list: Zone[]): number {
  let index = -1;
  list.forEach((zone, i) => {
    if (zone.above) index = i;
  });
  return index;
}

/** Index of the zone an anchor target belongs to: the last zone header before or inside it. */
function indexOfTarget(list: Zone[], target: Element): number {
  let index = -1;
  list.forEach((zone, i) => {
    const position = target.compareDocumentPosition(zone.el);
    if (position & Node.DOCUMENT_POSITION_PRECEDING || position & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      index = i;
    }
  });
  return index;
}

function endJump() {
  jumpTarget = null;
  clearTimeout(idleTimer);
  clearTimeout(timeoutTimer);
  window.removeEventListener('scroll', onJumpScroll);
  window.removeEventListener('scrollend', endJump);
}

function onJumpScroll() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(endJump, SCROLL_IDLE_MS);
}

/** In-page link clicks: a jump across several zones must not flash every banner on the way. */
function onClick(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
  const id = link?.getAttribute('href')?.slice(1);
  const target = id ? document.getElementById(decodeURIComponent(id)) : null;
  if (!target) return;
  const list = ordered();
  const to = indexOfTarget(list, target);
  if (Math.abs(to - currentIndex(list)) <= MAX_ANNOUNCED_STEP) return;
  endJump();
  jumpTarget = to;
  window.addEventListener('scroll', onJumpScroll, { passive: true });
  window.addEventListener('scrollend', endJump);
  // If the page never scrolls (already there), the idle timer still ends the jump.
  idleTimer = setTimeout(endJump, SCROLL_IDLE_MS * 3);
  timeoutTimer = setTimeout(endJump, JUMP_TIMEOUT_MS);
}

function arm() {
  armed = true;
  ARMING_EVENTS.forEach(type => window.removeEventListener(type, arm, true));
}

function onIntersect(entries: IntersectionObserverEntry[]) {
  const list = ordered();
  const crossed: Zone[] = [];
  for (const entry of entries) {
    const zone = zones.get(entry.target);
    if (!zone) continue;
    const was = zone.above;
    zone.above = entry.isIntersecting;
    // The first report is the state on load: an already-passed zone never announces itself.
    if (was !== false || !zone.above) continue;
    // Jumped straight past it (e.g. the End key): the header is above the viewport.
    if (entry.boundingClientRect.bottom <= 0) continue;
    if (!armed || fired.has(zone.id)) continue;
    crossed.push(zone);
  }
  if (crossed.length === 0) return;
  // Several zones in one report is a jump too: only the lowest (the one on screen) announces.
  const last = crossed.reduce((a, b) => (list.indexOf(b) > list.indexOf(a) ? b : a));
  if (jumpTarget !== null && list.indexOf(last) !== jumpTarget) return;
  fired.add(last.id);
  last.enter();
}

function register(zone: Zone) {
  if (!observer) {
    observer = new window.IntersectionObserver(onIntersect, { rootMargin: ROOT_MARGIN, threshold: 0 });
    document.addEventListener('click', onClick, true);
    if (!armed) {
      ARMING_EVENTS.forEach(type => window.addEventListener(type, arm, { capture: true, passive: true }));
    }
  }
  zones.set(zone.el, zone);
  observer.observe(zone.el);
}

function unregister(zone: Zone) {
  if (zones.get(zone.el) !== zone) return;
  zones.delete(zone.el);
  observer?.unobserve(zone.el);
  if (zones.size === 0) {
    observer?.disconnect();
    observer = null;
    document.removeEventListener('click', onClick, true);
    ARMING_EVENTS.forEach(type => window.removeEventListener(type, arm, true));
    endJump();
  }
}

/** Test helper: forget every zone, banner and arming state. */
export function resetZoneEntered() {
  Array.from(zones.values()).forEach(unregister);
  fired.clear();
  armed = false;
  endJump();
}

/**
 * "Zone entered" trigger (SPEC §2.5, signature moment ③). Watches the element with the given
 * `id` (a ZoneHeader's H2) and returns `true` from the moment it first crosses 35% of the
 * viewport while the user scrolls down. It fires at most once per page load and never:
 *
 * - on load, for a zone that is already past the line (including browser scroll restoration:
 *   nothing fires before the first wheel / touch / key / pointer / click input);
 * - for the zones a nav click jumps over when it spans more than one zone (only the zone it
 *   lands in may announce itself);
 * - under `prefers-reduced-motion: reduce` (always `false`).
 */
export function useZoneEntered(id: string): boolean {
  const reduced = usePrefersReducedMotion();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (reduced || entered || fired.has(id)) return;
    if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') return;
    const el = document.getElementById(id);
    if (!el) return;
    const zone: Zone = { id, el, above: null, enter: () => setEntered(true) };
    register(zone);
    return () => unregister(zone);
  }, [id, reduced, entered]);

  return entered && !reduced;
}
