import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineEllipsisVertical,
  HiOutlineStar,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowDownTray,
  HiOutlineBellSlash,
  HiOutlineArchiveBox,
  HiOutlinePaintBrush,
  HiOutlinePhoto,
  HiOutlineMapPin,
  HiOutlineTrash,
  HiOutlineCheck,
} from 'react-icons/hi2';
import { HiStar } from 'react-icons/hi';
import { useTheme, THEMES, type ThemeName } from '@/context/ThemeContext';
import { useWallpaper } from '@/context/WallpaperContext';
import { WALLPAPERS } from '@/types/wallpaper';
import {
  clearChat,
  togglePinConversation,
  toggleMuteConversation,
  toggleArchiveConversation,
  getStarredMessages,
  exportChat,
} from '@/services/firestore';
import { useAuth } from '@/context/AuthContext';
import type { Message, Conversation } from '@/types';
import LiveLocationPanel from '@/components/LiveLocationPanel';

type MenuView = 'main' | 'starred' | 'theme' | 'wallpaper' | 'wallpaper-solids' | 'wallpaper-gradients';

interface ConfirmAction {
  title: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface ChatMenuProps {
  conversationId: string;
  conversation?: Conversation;
  otherUserId: string;
  onSearchOpen: () => void;
  onConversationDeleted: () => void;
}

const SOLID_COLORS = [
  { id: 's1', label: 'Deep Navy', css: 'linear-gradient(180deg, #0f172a, #1e293b)' },
  { id: 's2', label: 'Charcoal', css: 'linear-gradient(180deg, #18181b, #27272a)' },
  { id: 's3', label: 'Midnight', css: 'linear-gradient(180deg, #0c0a1a, #1a1533)' },
  { id: 's4', label: 'Forest', css: 'linear-gradient(180deg, #052e16, #14532d)' },
  { id: 's5', label: 'Olive', css: 'linear-gradient(180deg, #1a1f13, #2d3319)' },
  { id: 's6', label: 'Burgundy', css: 'linear-gradient(180deg, #1a0a0f, #3b0f1a)' },
  { id: 's7', label: 'Indigo', css: 'linear-gradient(180deg, #0f0a2a, #1e1544)' },
  { id: 's8', label: 'Slate', css: 'linear-gradient(180deg, #1a1e2e, #2d3142)' },
  { id: 's9', label: 'Plum', css: 'linear-gradient(180deg, #1a0a2a, #2d1544)' },
  { id: 's10', label: 'Teal', css: 'linear-gradient(180deg, #0a1a1e, #153033)' },
  { id: 's11', label: 'Rust', css: 'linear-gradient(180deg, #1a0f0a, #2d1a12)' },
  { id: 's12', label: 'Sage', css: 'linear-gradient(180deg, #1a1f1a, #2d382d)' },
];

const GRADIENT_COLORS = [
  { id: 'g1', label: 'Sunset', css: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  { id: 'g2', label: 'Ocean', css: 'linear-gradient(135deg, #0a1628, #1a2744, #0d2137)' },
  { id: 'g3', label: 'Aurora', css: 'linear-gradient(135deg, #0a0a1a, #1a1a2f, #150d24)' },
  { id: 'g4', label: 'Forest', css: 'linear-gradient(135deg, #0a1a0a, #1a2f1a, #0d2415)' },
  { id: 'g5', label: 'Sunset Glow', css: 'linear-gradient(135deg, #1a0a0a, #2f1a1a, #241510)' },
  { id: 'g6', label: 'Lavender', css: 'linear-gradient(135deg, #111122, #1a1a3a, #221a3a)' },
  { id: 'g7', label: 'Peach', css: 'linear-gradient(135deg, #1a1a1a, #2f1a22, #241518)' },
  { id: 'g8', label: 'Mint', css: 'linear-gradient(135deg, #0a1a15, #1a2f28, #0d2420)' },
  { id: 'g9', label: 'Coral', css: 'linear-gradient(135deg, #1a0f0a, #2f1a15, #241a0d)' },
  { id: 'g10', label: 'Cosmic', css: 'linear-gradient(135deg, #0a001a, #1a0a2f, #240d24)' },
];

export default function ChatMenu({
  conversationId,
  conversation,
  otherUserId: _otherUserId,
  onSearchOpen,
  onConversationDeleted,
}: ChatMenuProps) {
  const { user: _user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setWallpaper } = useWallpaper();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>('main');
  const [starredMessages, setStarredMessages] = useState<Message[]>([]);
  const [loadingStarred, setLoadingStarred] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [showLiveLocation, setShowLiveLocation] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setView('main');
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, close]);

  async function handleClearChat() {
    setConfirmAction({
      title: 'Clear Chat',
      message: 'This will permanently delete all messages in this chat. This action cannot be undone.',
      danger: true,
      onConfirm: async () => {
        setConfirmAction(null);
        setActionLoading(true);
        try {
          await clearChat(conversationId);
          close();
        } catch (e) {
          console.error('Clear chat failed:', e);
        } finally {
          setActionLoading(false);
        }
      },
    });
  }

  async function handlePin() {
    setActionLoading(true);
    try {
      await togglePinConversation(conversationId, !conversation?.pinned);
      close();
    } catch (e) {
      console.error('Pin toggle failed:', e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStarredMessages() {
    setView('starred');
    setLoadingStarred(true);
    try {
      const msgs = await getStarredMessages(conversationId);
      setStarredMessages(msgs);
    } catch (e) {
      console.error('Failed to load starred messages:', e);
    } finally {
      setLoadingStarred(false);
    }
  }

  async function handleExportChat() {
    setActionLoading(true);
    try {
      const text = await exportChat(conversationId);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novachat-export-${conversationId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      close();
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMute() {
    setActionLoading(true);
    try {
      await toggleMuteConversation(conversationId, !conversation?.muted);
      close();
    } catch (e) {
      console.error('Mute toggle failed:', e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleArchive() {
    setActionLoading(true);
    try {
      await toggleArchiveConversation(conversationId, !conversation?.archived);
      close();
    } catch (e) {
      console.error('Archive toggle failed:', e);
    } finally {
      setActionLoading(false);
    }
  }

  function handleWallpaperSelect(css: string) {
    setWallpaper({ id: `custom-${Date.now()}`, label: 'Custom', css });
    close();
  }

  function handleWallpaperClear() {
    setWallpaper(null);
    close();
  }

  function renderMenuItems() {
    switch (view) {
      case 'theme':
        return (
          <>
            <MenuHeader title="Theme" onBack={() => setView('main')} />
            <div className="px-3 py-2">
              <div className="grid grid-cols-3 gap-2">
                {(['dark', 'light', 'midnight', 'forest', 'sunset', 'rose'] as ThemeName[]).map((t) => (
                  <button key={t} onClick={() => { setTheme(t); close(); }}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-[11px] font-medium transition-all ${
                      theme === t ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30' : 'hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]'
                    }`}>
                    <div className="w-6 h-6 rounded-full ring-2 ring-white/10" style={{ background: THEMES.find(th => th.id === t)?.preview[0] }} />
                    <span>{THEMES.find(th => th.id === t)?.label}</span>
                    {theme === t && <HiOutlineCheck className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        );
      case 'wallpaper':
        return (
          <>
            <MenuHeader title="Chat Wallpaper" onBack={() => setView('main')} />
            <MenuItem label="Solid Colors" icon={HiOutlinePaintBrush} onClick={() => setView('wallpaper-solids')} trailing />
            <MenuItem label="Gradient Colors" icon={HiOutlinePhoto} onClick={() => setView('wallpaper-gradients')} trailing />
            <div className="mx-3 my-1 border-t border-[var(--border-primary)]" />
            <MenuItem label="Default (No Wallpaper)" icon={HiOutlineTrash} onClick={handleWallpaperClear} />
          </>
        );
      case 'wallpaper-solids':
        return (
          <>
            <MenuHeader title="Solid Colors" onBack={() => setView('wallpaper')} />
            <div className="px-3 py-2 grid grid-cols-4 gap-2">
              {SOLID_COLORS.map((c) => (
                <button key={c.id} onClick={() => handleWallpaperSelect(c.css)}
                  className="aspect-square rounded-xl border-2 border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:scale-105 transition-all overflow-hidden" title={c.label}>
                  <div className="w-full h-full" style={{ background: c.css }} />
                </button>
              ))}
            </div>
          </>
        );
      case 'wallpaper-gradients':
        return (
          <>
            <MenuHeader title="Gradient Colors" onBack={() => setView('wallpaper')} />
            <div className="px-3 py-2 grid grid-cols-4 gap-2">
              {GRADIENT_COLORS.map((c) => (
                <button key={c.id} onClick={() => handleWallpaperSelect(c.css)}
                  className="aspect-square rounded-xl border-2 border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:scale-105 transition-all overflow-hidden" title={c.label}>
                  <div className="w-full h-full" style={{ background: c.css }} />
                </button>
              ))}
            </div>
          </>
        );
      case 'starred':
        return (
          <>
            <MenuHeader title="Star Messages" onBack={() => setView('main')} />
            {loadingStarred ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
              </div>
            ) : starredMessages.length === 0 ? (
              <div className="py-8 text-center px-4">
                <HiOutlineStar className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[13px] text-[var(--text-muted)]">No starred messages</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {starredMessages.map((msg) => (
                  <div key={msg.id} className="px-4 py-3 hover:bg-[var(--hover-bg)] transition-all border-b border-[var(--border-secondary)]">
                    <p className="text-[12px] text-[var(--text-muted)] mb-0.5">
                      {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[13px] text-[var(--text-primary)] line-clamp-2">{msg.text || `📎 ${msg.type}`}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      default:
        return (
          <>
            <MenuItem label={conversation?.pinned ? 'Unpin Chat' : 'Pin Chat'} icon={HiOutlineMapPin} onClick={handlePin} loading={actionLoading} />
            <MenuItem label="Star Messages" icon={HiOutlineStar} onClick={handleStarredMessages} />
            <MenuItem label="Search" icon={HiOutlineMagnifyingGlass} onClick={() => { onSearchOpen(); close(); }} />
            <MenuItem label="Export Chat" icon={HiOutlineArrowDownTray} onClick={handleExportChat} loading={actionLoading} />
            <div className="mx-3 my-1 border-t border-[var(--border-primary)]" />
            <MenuItem label={conversation?.muted ? 'Unmute' : 'Mute'} icon={HiOutlineBellSlash} onClick={handleMute} loading={actionLoading} />
            <MenuItem label={conversation?.archived ? 'Unarchive' : 'Archive'} icon={HiOutlineArchiveBox} onClick={handleArchive} loading={actionLoading} />
            <div className="mx-3 my-1 border-t border-[var(--border-primary)]" />
            <MenuItem label="Theme" icon={HiOutlinePaintBrush} onClick={() => setView('theme')} trailing />
            <MenuItem label="Wallpaper" icon={HiOutlinePhoto} onClick={() => setView('wallpaper')} trailing />
            <MenuItem label="Share Live Location" icon={HiOutlineMapPin} onClick={() => setShowLiveLocation(true)} />
            <div className="mx-3 my-1 border-t border-[var(--border-primary)]" />
            <MenuItem label="Clear Chat" icon={HiOutlineTrash} onClick={handleClearChat} loading={actionLoading} danger />
          </>
        );
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setOpen(!open)}
        className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition-all ${
          open ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
        }`}>
        <HiOutlineEllipsisVertical className="w-[20px] h-[20px]" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" onClick={close} />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-full mt-2 w-[272px] sm:w-[272px] glass-premium rounded-[20px] shadow-[var(--shadow-xl)] z-50 overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-primary)]/30 to-transparent" />
              <div className="py-1">{renderMenuItems()}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {showLiveLocation && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center" onClick={() => setShowLiveLocation(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-[400px] mx-4 mb-4 md:mb-0 md:mx-0" onClick={(e) => e.stopPropagation()}>
            <LiveLocationPanel conversationId={conversationId} onClose={() => setShowLiveLocation(false)} />
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {confirmAction && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={() => setConfirmAction(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-[320px] mx-auto bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-[20px] p-5 z-[70] shadow-[var(--shadow-xl)]">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">{confirmAction.title}</h3>
              <p className="text-[13px] text-[var(--text-secondary)] mb-5 leading-relaxed">{confirmAction.message}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmAction(null)}
                  className="flex-1 py-2.5 text-[13px] font-medium rounded-[12px] bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-all">Cancel</button>
                <button onClick={confirmAction.onConfirm}
                  className={`flex-1 py-2.5 text-[13px] font-medium rounded-[12px] text-white transition-all ${confirmAction.danger ? 'bg-[var(--danger)] hover:opacity-90' : 'bg-[var(--accent-primary)] hover:opacity-90'}`}>Confirm</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border-primary)]">
      <button onClick={onBack}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-all">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</span>
    </div>
  );
}

function MenuItem({ label, icon: Icon, onClick, loading = false, danger = false, trailing = false }: {
  label: string; icon?: React.ComponentType<{ className?: string }>; onClick: () => void; loading?: boolean; danger?: boolean; trailing?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all disabled:opacity-50 hover:bg-[var(--hover-bg)]`}>
      {Icon && <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${danger ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`} />}
      <span className={`flex-1 text-[13px] ${danger ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>{label}</span>
      {loading && <div className="w-4 h-4 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />}
      {trailing && !loading && (
        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      )}
    </button>
  );
}
