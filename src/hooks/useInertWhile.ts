import { useEffect } from 'react';

/**
 * While `active`, the elements `select()` returns (read when it turns on) leave the tab order and
 * the accessibility tree through `inert`. Turning off restores exactly what it changed: an element
 * that was already inert (by markup, or by another overlay) stays inert.
 */
export function useInertWhile(active: boolean, select: () => Iterable<Element>): void {
  useEffect(() => {
    if (!active) return;
    const changed = [...select()].filter(el => !el.hasAttribute('inert'));
    changed.forEach(el => el.setAttribute('inert', ''));
    return () => changed.forEach(el => el.removeAttribute('inert'));
    // `select` is read once per activation, from the render that turned it on.
  }, [active]);
}
