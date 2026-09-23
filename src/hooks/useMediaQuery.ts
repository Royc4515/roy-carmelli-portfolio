import { useEffect, useState } from 'react';

/**
 * Reactive `matchMedia` for breakpoint-dependent rendering (e.g. choosing an integer sprite
 * scale). Prefer CSS for purely visual changes; use this only when the rendered markup or a
 * computed value must change. SSR/jsdom safe: returns `false` when `matchMedia` is missing.
 */
export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
