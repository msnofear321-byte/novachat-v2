import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChatBubbleLeftRight, HiOutlineUsers, HiOutlineCog6Tooth, HiOutlineArrowRightOnRectangle, HiOutlineEye, HiOutlineMagnifyingGlass, HiOutlineShieldCheck, HiOutlinePencilSquare } from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { logout } from '@/services/auth';
import UserAvatar from '@/components/UserAvatar';

interface SidebarProps {
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

export default function Sidebar({ onOpenSearch, totalUnread = 0 }: SidebarProps) {
  const { user } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const activeIndex = navItems.findIndex((n) => n.path === location.pathname);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <div className="w-[68px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-primary)] flex flex-col items-center py-5 gap-1 relative z-10">
        {/* Logo */}
        <div className="mb-5">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-[0_4px_20px_var(--accent-glow)]"
          >
            <svg className="w-5.5 h-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col items-center gap-1.5 flex-1 mt-2">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = activeIndex === i;
            return (
              <motion.button
                key={item.path}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { if (item.path === '/contacts') { onOpenSearch(); } else { navigate(item.path); } }}
                className={`relative w-11 h-11 rounded-[13px] flex items-center justify-center transition-all duration-200 ${
                  isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
                }`}
              >
                {isActive && (
                  <motion.div layoutId="sidebar-active" className="absolute inset-0 bg-[var(--accent-primary)]/15 rounded-[13px]" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <Icon className="w-[22px] h-[22px] relative z-10" />
                {item.hasBadge && totalUnread > 0 && (
                  <span className="nav-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
                )}
              </motion.button>
            );
          })}

          {/* Search button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={onOpenSearch}
            className="w-11 h-11 rounded-[13px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-glow)] transition-all duration-200 mt-1"
          >
            <HiOutlineMagnifyingGlass className="w-[20px] h-[20px]" />
          </motion.button>
        </nav>

        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-2 mt-auto">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
            className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[var(--accent-primary)] hover:bg-[var(--hover-bg)] transition-all duration-200"
          >
            <div className="w-5 h-5 rounded-full border-2 border-[var(--accent-primary)] relative overflow-hidden" style={{ background: `var(--accent-primary)` }}>
              <div className="absolute inset-0 bg-white/20 rounded-full" style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%)' }} />
            </div>
          </motion.button>

          {user && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowLogoutConfirm(true)}
              className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all duration-200"
            >
              <HiOutlineArrowRightOnRectangle className="w-[20px] h-[20px]" />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')}
            className="mt-1 relative"
          >
            <UserAvatar photoURL={user?.photoURL ?? undefined} displayName={user?.displayName || '?'} size="sm" online />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowLogoutConfirm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="w-full max-w-[360px] glass-premium rounded-[24px] p-6"
              onClick={(e) => e.stopPropagation()}>
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
      </AnimatePresence>
    </>
  );
}
