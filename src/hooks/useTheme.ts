import { useEffect, useState, useCallback, useRef } from 'react';

export type Theme = 'day' | 'night';

export const THEME_STORAGE_KEY = 'roy-portfolio-theme';

/** Class on <html> that enables the 350ms colour cross-fade (see src/index.css). */
export const THEME_ANIM_CLASS = 'theme-anim';

/** How long `theme-anim` stays on after a toggle: the 350ms fade plus a frame of slack. */
export const THEME_ANIM_MS = 400;

function isTheme(value: unknown): value is Theme {
  return value === 'day' || value === 'night';
}

/**
 * The inline script in index.html sets `data-theme` before the first paint, so that
 * attribute is the source of truth. The fallbacks (stored choice, then the OS
 * preference) mirror that script for environments where it did not run (tests).
 */
export function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'day';
  const fromDom = document.documentElement.dataset.theme;
  if (isTheme(fromDom)) return fromDom;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Storage blocked (private mode, sandboxed iframe): fall through to the OS preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}

/**
 * Day/night theme, mirrored to `<html data-theme>`; a toggled choice is also stored in
 * localStorage (the page load itself never writes, so the OS preference keeps applying).
 * `toggle` also turns on the colour cross-fade for one transition; loading the page
 * never animates.
 */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const animTimer = useRef<number | undefined>(undefined);
  /** Set by `toggle`: only an explicit choice is stored, so until then the OS preference wins. */
  const chosen = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (!chosen.current) return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Not persisted; the theme still applies for this visit.
    }
  }, [theme]);

  useEffect(
    () => () => {
      window.clearTimeout(animTimer.current);
      document.documentElement.classList.remove(THEME_ANIM_CLASS);
    },
    []
  );

  const toggle = useCallback(() => {
    chosen.current = true;
    const root = document.documentElement;
    root.classList.add(THEME_ANIM_CLASS);
    window.clearTimeout(animTimer.current);
    animTimer.current = window.setTimeout(() => {
      root.classList.remove(THEME_ANIM_CLASS);
    }, THEME_ANIM_MS);
    setTheme(t => (t === 'day' ? 'night' : 'day'));
  }, []);

  return [theme, toggle];
}
