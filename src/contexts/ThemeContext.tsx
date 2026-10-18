import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeColor, ThemeMode } from '../types';

interface ThemeContextType {
  mode: ThemeMode;
  color: ThemeColor;
  setMode: (mode: ThemeMode) => void;
  setColor: (color: ThemeColor) => void;
  toggleMode: () => void;
}

const THEME_HEADER_COLORS: Record<ThemeMode, Record<ThemeColor, string>> = {
  light: {
    default: '#0088cc',
    green: '#4CAF50',
    purple: '#673AB7',
    orange: '#FF9800',
  },
  dark: {
    default: '#1e293b',
    green: '#132e1b',
    purple: '#271638',
    orange: '#361e08',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('chatAppThemeMode') as ThemeMode) || 'light';
  });

  const [color, setColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem('chatAppThemeColor') as ThemeColor) || 'default';
  });

  useEffect(() => {
    document.body.classList.toggle('dark-theme', mode === 'dark');
    document.body.setAttribute('data-color-theme', color);
    localStorage.setItem('chatAppThemeMode', mode);
    localStorage.setItem('chatAppThemeColor', color);

    const headerColor = THEME_HEADER_COLORS[mode]?.[color] || (mode === 'dark' ? '#1e293b' : '#0088cc');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', headerColor);
    }
    try {
      (window as any).AndroidBridge?.setStatusBarColor?.(headerColor);
    } catch {}
  }, [mode, color]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const setColor = (newColor: ThemeColor) => {
    setColorState(newColor);
  };

  const toggleMode = () => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ mode, color, setMode, setColor, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
