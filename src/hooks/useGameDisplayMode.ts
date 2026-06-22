import { useState, useEffect } from 'react';

/**
 * Decides how the Roy Runner mini-game should be presented:
 *
 *  - `desktop` — pointer is fine (mouse/trackpad): render the game exactly as before,
 *                with no touch chrome. Window width is irrelevant here.
 *  - `rotate`  — a touch *phone* held in portrait: the 800×446 canvas would be tiny, so
 *                show a "rotate your phone" prompt instead. Tablets are excluded — at
 *                ≥768px the canvas fits comfortably, so portrait tablets get `touch`.
 *  - `touch`   — a touch device that can fit the game (any landscape touch device, or a
 *                portrait tablet): render the game enlarged with on-screen touch controls
 *                (tap to jump + SLIDE button).
 *
 * We gate on `(pointer: coarse)` rather than viewport width because a phone in landscape
 * is frequently wider than the 767px mobile breakpoint — width alone would mis-classify
 * it as desktop. Width only enters the *portrait* decision, to keep portrait tablets
 * playable. Orientation uses a media query (reactive, and avoids stale
 * innerWidth/innerHeight readings during the iOS rotation animation).
 */
export type GameDisplayMode = 'desktop' | 'rotate' | 'touch';

const COARSE_QUERY = '(pointer: coarse)';
const PORTRAIT_QUERY = '(orientation: portrait)';
// Same breakpoint as useIsMobile — distinguishes phone-sized screens from tablets.
const NARROW_QUERY = '(max-width: 767px)';

function computeMode(): GameDisplayMode {
  const coarse = window.matchMedia(COARSE_QUERY).matches;
  if (!coarse) return 'desktop';
  const portrait = window.matchMedia(PORTRAIT_QUERY).matches;
  if (!portrait) return 'touch'; // any landscape touch device plays
  // Portrait: only phone-sized screens are too cramped to play.
  const narrow = window.matchMedia(NARROW_QUERY).matches;
  return narrow ? 'rotate' : 'touch';
}

export function useGameDisplayMode(): GameDisplayMode {
  const [mode, setMode] = useState<GameDisplayMode>(computeMode);

  useEffect(() => {
    const mqls = [COARSE_QUERY, PORTRAIT_QUERY, NARROW_QUERY].map(q => window.matchMedia(q));
    const update = () => setMode(computeMode());

    mqls.forEach(mql => mql.addEventListener('change', update));
    return () => mqls.forEach(mql => mql.removeEventListener('change', update));
  }, []);

  return mode;
}
