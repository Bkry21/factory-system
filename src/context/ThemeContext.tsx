import React, { createContext, useContext, useState, ReactNode } from 'react';
import ColorsDark  from '../constants/colors';
import ColorsLight from '../constants/colorsLight';

export type ThemeMode = 'dark' | 'light';

// نفس شكل Colors object
type ColorsType = typeof ColorsDark;

interface ThemeContextValue {
  mode:       ThemeMode;
  colors:     ColorsType;
  isDark:     boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const toggleTheme = () =>
    setMode(prev => (prev === 'dark' ? 'light' : 'dark'));

  const value: ThemeContextValue = {
    mode,
    colors:  mode === 'dark' ? ColorsDark : ColorsLight,
    isDark:  mode === 'dark',
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside ThemeProvider');
  return ctx;
}