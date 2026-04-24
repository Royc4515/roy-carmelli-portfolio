import { useEffect, useState, useCallback } from 'react';

export type Theme = 'day' | 'night';

const STORAGE_KEY = 'roy-portfolio-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'day';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'day' || stored === 'night') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(t => (t === 'day' ? 'night' : 'day'));
  }, []);

  return [theme, toggle];
}
