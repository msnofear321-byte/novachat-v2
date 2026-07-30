import { motion } from 'framer-motion';
import { HiOutlineXMark, HiOutlineCheck } from 'react-icons/hi2';
import { useWallpaper } from '@/context/WallpaperContext';
import { WALLPAPERS } from '@/types/wallpaper';

interface WallpaperPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WallpaperPicker({ isOpen, onClose }: WallpaperPickerProps) {
  const { wallpaper, setWallpaper } = useWallpaper();
  if (!isOpen) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-[500px] bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-[24px] shadow-[var(--shadow-xl)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Chat Wallpaper</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-all">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          {WALLPAPERS.map((wp) => (
            <button key={wp.id} onClick={() => { setWallpaper(wp); onClose(); }}
              className={`relative aspect-[3/4] rounded-[14px] overflow-hidden border-2 transition-all ${
                wallpaper?.id === wp.id ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30' : 'border-[var(--border-primary)] hover:border-[var(--accent-primary)]/40'
              }`}
              style={wp.css ? { backgroundImage: wp.css, backgroundSize: 'cover' } : { backgroundColor: '#1a1a2e' }}>
              {wallpaper?.id === wp.id && (
                <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg">
                    <HiOutlineCheck className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-[11px] font-medium">{wp.label}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-[var(--border-primary)]">
          <button onClick={() => { setWallpaper(null); onClose(); }}
            className="w-full py-2.5 text-[var(--text-secondary)] text-[13px] font-medium hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-[12px] transition-all">
            Remove Wallpaper
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
