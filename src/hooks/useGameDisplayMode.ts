import { useState, useEffect } from 'react';

/**
 * Decides how the Roy Runner mini-game should be presented:
 *
 *  - `desktop` — pointer is fine (mouse/trackpad): render the game exactly as before,
 *                with no touch chrome. Window width is irrelevant here.
 *  - `rotate`  — a touch phone held in portrait: the 800×446 canvas would be tiny, so
 *                show a "rotate your phone" prompt instead.
 *  - `touch`   — a touch phone in landscape: render the game enlarged, with on-screen
 *                touch controls (tap to jump + SLIDE button).
 *
 * We gate on `(pointer: coarse)` rather than viewport width because a phone in landscape
 * is frequently wider than the 767px mobile breakpoint — width alone would mis-classify
 * it as desktop. Orientation uses a media query (reactive, and avoids stale
 * innerWidth/innerHeight readings during the iOS rotation animation).
 */
export type GameDisplayMode = 'desktop' | 'rotate' | 'touch';

const COARSE_QUERY = '(pointer: coarse)';
const PORTRAIT_QUERY = '(orientation: portrait)';

function computeMode(): GameDisplayMode {
  const coarse = window.matchMedia(COARSE_QUERY).matches;
  if (!coarse) return 'desktop';
  const portrait = window.matchMedia(PORTRAIT_QUERY).matches;
  return portrait ? 'rotate' : 'touch';
}

export function useGameDisplayMode(): GameDisplayMode {
  const [mode, setMode] = useState<GameDisplayMode>(computeMode);

  useEffect(() => {
    const coarseMql = window.matchMedia(COARSE_QUERY);
    const portraitMql = window.matchMedia(PORTRAIT_QUERY);
    const update = () => setMode(computeMode());

    coarseMql.addEventListener('change', update);
    portraitMql.addEventListener('change', update);
    return () => {
      coarseMql.removeEventListener('change', update);
      portraitMql.removeEventListener('change', update);
    };
  }, []);

  return mode;
}
