// Tema — sektral/apps/web/src/lib/theme.ts portu (dark-first).

import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'sectrai.theme';

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch {
    /* no-op */
  }
  return 'dark';
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* no-op */
  }
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(getTheme);
  useEffect(() => {
    apply(theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
