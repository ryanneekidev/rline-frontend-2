'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themePref: ThemePref;
  setThemePref: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyTheme(pref: ThemePref) {
  const isDark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePref, setThemePrefState] = useState<ThemePref>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const pref: ThemePref =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setThemePrefState(pref);
    applyTheme(pref);

    // Re-apply when system preference changes (only matters when pref is 'system')
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function handleChange() {
      const current = localStorage.getItem('theme') ?? 'system';
      if (current === 'system') applyTheme('system');
    }
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  function setThemePref(pref: ThemePref) {
    setThemePrefState(pref);
    localStorage.setItem('theme', pref);
    applyTheme(pref);
  }

  return (
    <ThemeContext.Provider value={{ themePref, setThemePref }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
