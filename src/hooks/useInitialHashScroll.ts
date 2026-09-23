import { useEffect } from 'react';

/**
 * Deep links (`/#skills`): the browser jumps to the fragment on load, but that happens
 * before React has rendered the sections, so it finds nothing and stays at the top. Jump
 * once after the first render, and again when the web fonts have settled (their metrics
 * move the sections) unless the visitor has started scrolling by then.
 */
export function useInitialHashScroll(): void {
  useEffect(() => {
    let id = '';
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return; // Malformed escape in the hash: nothing to jump to.
    }
    if (!id) return;
    const jump = () => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    jump();

    let cancelled = false;
    const stop = () => {
      cancelled = true;
    };
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    for (const type of events) window.addEventListener(type, stop, { passive: true, once: true });
    document.fonts?.ready.then(() => {
      if (!cancelled) jump();
    });
    return () => {
      cancelled = true;
      for (const type of events) window.removeEventListener(type, stop);
    };
  }, []);
}
