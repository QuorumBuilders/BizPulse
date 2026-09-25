'use client';
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'bizpulse-theme';

/**
 * Read and toggle the BizPulse colour theme.
 *
 * The source of truth is `document.documentElement`'s data-theme attribute,
 * which is set before first paint by the inline script in layout.tsx.
 * Calling `toggle()` or `setTheme()` updates the attribute AND persists to
 * localStorage so the next visit remembers the user's explicit choice.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'light';
    return (document.documentElement.getAttribute('data-theme') as Theme) ?? 'light';
  });

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_) { /* ignore private-browsing quota errors */ }
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  // Sync React state if the attribute was set by the inline script
  // before this component mounted.
  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-theme') as Theme | null;
    if (attr && attr !== theme) setThemeState(attr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { theme, toggle, setTheme, isDark: theme === 'dark', isLight: theme === 'light' };
}
