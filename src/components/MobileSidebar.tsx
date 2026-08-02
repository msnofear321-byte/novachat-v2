import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChatBubbleLeftRight, HiOutlineUsers, HiOutlineCog6Tooth, HiOutlineArrowRightOnRectangle, HiOutlineEye, HiOutlineMagnifyingGlass, HiOutlineShieldCheck, HiOutlinePencilSquare, HiOutlineXMark } from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { logout } from '@/services/auth';
import UserAvatar from '@/components/UserAvatar';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  totalUnread?: number;
}

const navItems = [
  { icon: HiOutlineChatBubbleLeftRight, label: 'Chats', path: '/', hasBadge: true },
  { icon: HiOutlineEye, label: 'Status', path: '/status', hasBadge: false },
  { icon: HiOutlinePencilSquare, label: 'Notes', path: '/notes', hasBadge: false },
  { icon: HiOutlineUsers, label: 'Contacts', path: '/contacts', hasBadge: false },
  { icon: HiOutlineShieldCheck, label: 'Secret Chat', path: '/secret', hasBadge: false },
  { icon: HiOutlineCog6Tooth, label: 'Settings', path: '/settings', hasBadge: false },
] as const;

export default function MobileSidebar({ open, onClose, onOpenSearch, totalUnread = 0 }: MobileSidebarProps) {
  const { user } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const handleNav = (path: string) => {
    onClose();
    if (path === '/contacts') {
      onOpenSearch();
    } else {
      navigate(path);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-[var(--bg-sidebar)] border-r border-[var(--border-primary)] flex flex-col md:hidden shadow-[var(--shadow-xl)] safe-area-top"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-3 border-b border-[var(--border-secondary)]">
              <button onClick={onClose} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-all">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={() => { onClose(); navigate('/profile'); }}>
                <UserAvatar photoURL={user?.photoURL ?? undefined} displayName={user?.displayName || '?'} size="md" online />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{user?.displayName || 'Profile'}</p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{user?.email || ''}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto custom-scrollbar py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <motion.button
                    key={item.path}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all ${
                      isActive ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 border-l-[3px] border-l-[var(--accent-primary)]' : 'text-[var(--text-primary)] border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <Icon className="w-[22px] h-[22px]" />
                    <span className="text-[14px] font-medium">{item.label}</span>
                    {item.hasBadge && totalUnread > 0 && (
                      <span className="glow-badge ml-auto">{totalUnread > 99 ? '99+' : totalUnread}</span>
                    )}
                  </motion.button>
                );
              })}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { onClose(); onOpenSearch(); }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left text-[var(--text-primary)] border-l-[3px] border-l-transparent"
              >
                <HiOutlineMagnifyingGlass className="w-[22px] h-[22px] text-[var(--text-muted)]" />
                <span className="text-[14px] font-medium">Search</span>
              </motion.button>
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-[var(--border-secondary)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)] flex items-center gap-2">
              <button
                onClick={cycleTheme}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--hover-bg)] transition-all"
              >
                <span className="w-4 h-4 rounded-full border-2 border-[var(--accent-primary)]" style={{ background: 'var(--accent-primary)' }} />
                {theme}
              </button>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center text-[var(--danger)] bg-[var(--danger-bg)] hover:opacity-90 transition-all"
              >
                <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
              </button>
            </div>
          </motion.aside>

          {showLogoutConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:hidden" onClick={() => setShowLogoutConfirm(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
                className="w-full max-w-[340px] glass-premium rounded-[24px] p-6" onClick={(e) => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-[16px] bg-[var(--danger-bg)] flex items-center justify-center mx-auto mb-4">
                  <HiOutlineArrowRightOnRectangle className="w-7 h-7 text-[var(--danger)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] text-center mb-2">Sign Out</h3>
                <p className="text-[var(--text-secondary)] text-[14px] text-center mb-6">Are you sure you want to sign out?</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-[14px] font-medium text-[14px] hover:bg-[var(--hover-bg-strong)] transition-all">Cancel</button>
                  <button onClick={handleLogout} className="flex-1 py-3 bg-[var(--danger)] text-white rounded-[14px] font-medium text-[14px] hover:opacity-90 transition-all">Sign Out</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
