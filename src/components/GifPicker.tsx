import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineXMark, HiOutlineMagnifyingGlass } from 'react-icons/hi2';

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

const TENOR_KEY = 'AIzaSyBBJFS7BYOhPz2G0JiZmC7W2d0HpTlJYg8';
const CATEGORY_API = `https://tenor.googleapis.com/v2/categories?key=${TENOR_KEY}&limit=20`;
const SEARCH_API = `https://tenor.googleapis.com/v2/search?key=${TENOR_KEY}&limit=20&media_filter=tinygif`;

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [gifs, setGifs] = useState<{ id: string; url: string; preview: string }[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGifs = useCallback(async (url: string) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      const data = await res.json();
      setGifs(data.results.map((r: Record<string, unknown>) => {
        const mediaFormats = (r.media_formats || {}) as Record<string, { url: string }>;
        const tinygif = mediaFormats.tinygif || mediaFormats.gif;
        return {
          id: r.id as string,
          url: tinygif?.url || '',
          preview: '',
        };
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGifs(CATEGORY_API); }, [fetchGifs]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) { fetchGifs(CATEGORY_API); return; }
    fetchGifs(`${SEARCH_API}&q=${encodeURIComponent(query)}`);
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="w-full h-[320px] bg-[var(--bg-card)] border-t border-[var(--border-primary)] flex flex-col">
      <form onSubmit={handleSearch} className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
        <HiOutlineMagnifyingGlass className="w-4 h-4 text-[var(--text-muted)]" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search GIFs..."
          className="flex-1 bg-transparent text-[var(--text-primary)] text-[13px] placeholder-[var(--text-muted)] focus:outline-none" />
        <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <HiOutlineXMark className="w-4 h-4" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 grid grid-cols-3 gap-1.5">
        {loading ? (
          Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-square bg-[var(--bg-input)] rounded-[10px] animate-pulse" />)
        ) : (
          gifs.map((gif) => (
            <button key={gif.id} onClick={() => onSelect(gif.url)}
              className="aspect-square rounded-[10px] overflow-hidden hover:ring-2 hover:ring-[var(--accent-primary)] transition-all">
              <img src={gif.url} alt="gif" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}
