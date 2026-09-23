import { useEffect, useState } from 'react';

export interface ActiveSectionOptions {
  /**
   * Where the activation line sits, as a fraction of the viewport height from
   * the top. Default `0.3` (30%).
   */
  offset?: number;
}

/**
 * Of `elements`, the id of the one whose top edge is nearest to, and at or
 * above, `line` (px from the viewport top). `null` when every top is below it.
 */
export function pickActiveSection(elements: readonly HTMLElement[], line: number): string | null {
  let active: string | null = null;
  let nearest = -Infinity;
  for (const el of elements) {
    const top = el.getBoundingClientRect().top;
    if (top <= line && top > nearest) {
      nearest = top;
      active = el.id;
    }
  }
  return active;
}

/**
 * Scroll-spy for the nav (SPEC §3 Hooks). Returns the id of the section whose
 * top is nearest to, and above, a line at 30% of the viewport, or `null`
 * above the first section (e.g. on the hero).
 *
 * An IntersectionObserver with a zero-height root at that line fires whenever
 * a section edge crosses it; each callback re-measures, so there is no scroll
 * listener. Safe without `window` / IntersectionObserver (returns `null`).
 *
 * @example
 *   const active = useActiveSection(['projects', 'about', 'skills', 'contact']);
 *   <a href="#about" aria-current={active === 'about' ? 'true' : undefined}>About</a>
 */
export function useActiveSection(
  ids: readonly string[],
  options: ActiveSectionOptions = {},
): string | null {
  const offset = Math.min(Math.max(options.offset ?? 0.3, 0), 1);
  const [active, setActive] = useState<string | null>(null);
  // Callers usually pass an inline array: depend on its contents, not its identity.
  const key = ids.join('\n');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
      return;
    }
    const elements = key
      .split('\n')
      .map(id => (id ? document.getElementById(id) : null))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const update = () => setActive(pickActiveSection(elements, window.innerHeight * offset));

    const pct = Math.round(offset * 1000) / 10;
    const observer = new window.IntersectionObserver(update, {
      rootMargin: `-${pct}% 0px -${Math.round((100 - pct) * 10) / 10}% 0px`,
      threshold: 0,
    });
    elements.forEach(el => observer.observe(el));
    update();

    return () => observer.disconnect();
  }, [key, offset]);

  return active;
}
