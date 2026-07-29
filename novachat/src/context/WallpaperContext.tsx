import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { WALLPAPERS, type WallpaperOption } from '@/types/wallpaper';

interface WallpaperContextType {
  wallpaper: WallpaperOption | null;
  setWallpaper: (wallpaper: WallpaperOption | null) => void;
}

const WallpaperContext = createContext<WallpaperContextType>({
  wallpaper: WALLPAPERS[0],
  setWallpaper: () => {},
});

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const [wallpaper, setWallpaperState] = useState<WallpaperOption | null>(() => {
    try {
      const saved = localStorage.getItem('novachat-wallpaper');
      if (saved) {
        const parsed = JSON.parse(saved) as WallpaperOption | null;
        if (parsed && typeof parsed.id === 'string' && typeof parsed.css === 'string') {
          return WALLPAPERS.find((w) => w.id === parsed.id) || parsed;
        }
      }
    } catch {
      // ignore
    }
    return WALLPAPERS[0];
  });

  useEffect(() => {
    try {
      if (wallpaper) {
        localStorage.setItem('novachat-wallpaper', JSON.stringify(wallpaper));
      } else {
        localStorage.removeItem('novachat-wallpaper');
      }
    } catch {
      // storage unavailable
    }
  }, [wallpaper]);

  function setWallpaper(w: WallpaperOption | null) {
    setWallpaperState(w);
  }

  return (
    <WallpaperContext.Provider value={{ wallpaper, setWallpaper }}>
      {children}
    </WallpaperContext.Provider>
  );
}

export function useWallpaper() {
  return useContext(WallpaperContext);
}
