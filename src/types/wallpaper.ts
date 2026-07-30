export interface WallpaperOption {
  id: string;
  label: string;
  css: string;
}

export const WALLPAPERS: WallpaperOption[] = [
  { id: 'default', label: 'Default', css: '' },
  { id: 'midnight', label: 'Midnight', css: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, #0a1628, #1a2744, #0d2137)' },
  { id: 'forest', label: 'Forest', css: 'linear-gradient(135deg, #0a1a0a, #1a2f1a, #0d2415)' },
  { id: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg, #1a0a0a, #2f1a1a, #241510)' },
  { id: 'aurora', label: 'Aurora', css: 'linear-gradient(135deg, #0a0a1a, #1a1a2f, #150d24)' },
  { id: 'peach', label: 'Peach', css: 'linear-gradient(135deg, #1a1a1a, #2f1a22, #241518)' },
  { id: 'lavender', label: 'Lavender', css: 'linear-gradient(135deg, #111122, #1a1a3a, #221a3a)' },
  { id: 'mint', label: 'Mint', css: 'linear-gradient(135deg, #0a1a15, #1a2f28, #0d2420)' },
  { id: 'coral', label: 'Coral', css: 'linear-gradient(135deg, #1a0f0a, #2f1a15, #241a0d)' },
];
