import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** The whole reveal never takes longer than this, however long the text: recruiters skim. */
export const MAX_TYPE_MS = 1200;
/** Short lines still read as typed, not dumped. */
export const CHARS_PER_SECOND = 60;

export interface Typewriter {
  /** The part revealed so far (whole code points, so Hebrew or emoji never split). */
  shown: string;
  done: boolean;
}

/** How long `length` characters take to type. */
export function typeDuration(length: number): number {
  return Math.min(MAX_TYPE_MS, (length / CHARS_PER_SECOND) * 1000);
}

const frame = (cb: (now: number) => void): (() => void) => {
  if (typeof window.requestAnimationFrame === 'function') {
    const id = window.requestAnimationFrame(cb);
    return () => window.cancelAnimationFrame(id);
  }
  const id = window.setTimeout(() => cb(performance.now()), 16);
  return () => window.clearTimeout(id);
};

/**
 * RPG-style text reveal. `animate` is read when the text first mounts; `skip` changing finishes
 * at once (a click or key press in the panel). Reduced motion shows everything immediately.
 */
export function useTypewriter(text: string, animate: boolean, skip = 0): Typewriter {
  const reduced = usePrefersReducedMotion();
  const chars = Array.from(text);
  const instant = !animate || reduced || chars.length === 0;
  const [count, setCount] = useState(instant ? chars.length : 0);
  const [skipped, setSkipped] = useState(skip);

  // A skip request (the counter moved) finishes the reveal.
  if (skip !== skipped) {
    setSkipped(skip);
    if (count < chars.length) setCount(chars.length);
  }

  const total = chars.length;
  const finished = instant || count >= total;

  useEffect(() => {
    if (finished) return;
    const duration = typeDuration(total);
    let start: number | null = null;
    let cancel = () => {};
    const tick = (now: number) => {
      start ??= now;
      const next = Math.min(total, Math.ceil(((now - start) / duration) * total));
      setCount(c => Math.max(c, next));
      if (next < total) cancel = frame(tick);
    };
    cancel = frame(tick);
    return () => cancel();
    // Restart only when the text itself changes; `finished` stops the loop.
  }, [text, finished, total]);

  return finished ? { shown: text, done: true } : { shown: chars.slice(0, count).join(''), done: false };
}
