import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeName = 'dark' | 'light' | 'midnight' | 'forest' | 'sunset' | 'rose';
export type FontName = 'inter' | 'poppins' | 'space-grotesk' | 'outfit' | 'jetbrains';

export const THEMES: { id: ThemeName; label: string; preview: [string, string, string] }[] = [
  { id: 'dark', label: 'Dark', preview: ['#0B0B0F', '#7C3AED', '#F8FAFC'] },
  { id: 'light', label: 'Light', preview: ['#F8F9FC', '#7C3AED', '#0F172A'] },
  { id: 'midnight', label: 'Midnight Blue', preview: ['#0A0E1A', '#3B82F6', '#E2E8F0'] },
  { id: 'forest', label: 'Forest', preview: ['#0A120D', '#16A34A', '#ECFDF5'] },
  { id: 'sunset', label: 'Sunset', preview: ['#140D0A', '#EA580C', '#FFF7ED'] },
  { id: 'rose', label: 'Rose', preview: ['#140A0E', '#E11D48', '#FFF1F2'] },
];

export const FONTS: { id: FontName; label: string; family: string }[] = [
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { id: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
  { id: 'outfit', label: 'Outfit', family: "'Outfit', sans-serif" },
  { id: 'jetbrains', label: 'JetBrains Mono', family: "'JetBrains Mono', monospace" },
];

interface ThemeContextType {
  theme: ThemeName;
  font: FontName;
  setTheme: (theme: ThemeName) => void;
  setFont: (font: FontName) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  font: 'inter',
  setTheme: () => {},
  setFont: () => {},
  cycleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    try {
      return (localStorage.getItem('novachat-theme') as ThemeName) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [font, setFontState] = useState<FontName>(() => {
    try {
      return (localStorage.getItem('novachat-font') as FontName) || 'inter';
    } catch {
      return 'inter';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    THEMES.forEach((t) => root.classList.toggle(t.id, t.id === theme));
    try {
      localStorage.setItem('novachat-theme', theme);
    } catch {
      // storage unavailable
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const fontDef = FONTS.find((f) => f.id === font) || FONTS[0];
    root.style.setProperty('--font-app', fontDef.family);
    try {
      localStorage.setItem('novachat-font', font);
    } catch {
      // storage unavailable
    }
  }, [font]);

  function setTheme(t: ThemeName) {
    setThemeState(t);
  }

  function setFont(f: FontName) {
    setFontState(f);
  }

  function cycleTheme() {
    const idx = THEMES.findIndex((t) => t.id === theme);
    const next = (idx + 1) % THEMES.length;
    setThemeState(THEMES[next].id);
  }

  return (
    <ThemeContext.Provider value={{ theme, font, setTheme, setFont, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
