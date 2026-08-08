import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeName = 'dark' | 'light' | 'midnight' | 'forest' | 'sunset' | 'rose';
export type FontName = 'inter' | 'poppins' | 'space-grotesk' | 'outfit' | 'jetbrains';

export const THEMES: { id: ThemeName; label: string; preview: [string, string, string] }[] = [
  { id: 'dark', label: 'Dark', preview: ['#0B0D12', '#8B5CF6', '#F4F6FB'] },
  { id: 'light', label: 'Light', preview: ['#F4F5F9', '#7C3AED', '#11141C'] },
  { id: 'midnight', label: 'Midnight Blue', preview: ['#0B1220', '#3B82F6', '#E6EDF7'] },
  { id: 'forest', label: 'Forest', preview: ['#0A1510', '#22C55E', '#EDF9F1'] },
  { id: 'sunset', label: 'Sunset', preview: ['#16110D', '#F97316', '#FCF6F0'] },
  { id: 'rose', label: 'Rose', preview: ['#170F13', '#F43F5E', '#FDF3F5'] },
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
