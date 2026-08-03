import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineShieldCheck,
  HiOutlineCog6Tooth,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';
import { useUnread } from '@/context/UnreadContext';
import UserAvatar from '@/components/UserAvatar';
import SearchUsers from '@/components/SearchUsers';

interface TabItem {
  icon: typeof HiOutlineEye;
  label: string;
  path: string;
}

const tabs: TabItem[] = [
  { icon: HiOutlineChatBubbleLeftRight, label: 'Chats', path: '/' },
  { icon: HiOutlineEye, label: 'Status', path: '/status' },
  { icon: HiOutlinePencilSquare, label: 'Notes', path: '/notes' },
  { icon: HiOutlineShieldCheck, label: 'Secret', path: '/secret' },
  { icon: HiOutlineCog6Tooth, label: 'Settings', path: '/settings' },
];

function isTabActive(path: string, pathname: string) {
  if (path === '/') {
    return pathname === '/' || pathname.startsWith('/group/');
  }
  return pathname === path;
}

export default function TopNavigation() {
  const { user } = useAuth();
  const { totalUnread } = useUnread();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  function handleConversationCreated(id: string) {
    if (id.startsWith('group_')) {
      navigate(`/group/${id}`);
    } else {
      navigate(`/?c=${id}`);
    }
  }

  return (
    <header className="app-topnav">
      {/* Brand row */}
      <div className="px-3 sm:px-5 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2 flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          aria-label="NovaChat home"
          className="flex items-center gap-2.5 min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] sm:rounded-[11px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] flex items-center justify-center shadow-[0_2px_16px_var(--accent-glow)] flex-shrink-0">
            <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-[18px] sm:text-[20px] font-extrabold tracking-tight text-[var(--text-primary)] truncate">
            NovaChat
          </span>
        </motion.button>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchOpen(true)}
            aria-label="Search users"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-[11px] sm:rounded-[12px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-all"
          >
            <HiOutlineMagnifyingGlass className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px]" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/profile')}
            aria-label="Open profile"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center"
          >
            <UserAvatar photoURL={user?.photoURL ?? undefined} displayName={user?.displayName || '?'} size="sm" />
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="app-topnav-tabs">
        <div className="flex items-stretch overflow-x-auto scrollbar-hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab.path, location.pathname);
            return (
              <motion.button
                key={tab.path}
                whileTap={{ scale: 0.92 }}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center justify-center gap-0.5 min-w-[68px] sm:min-w-[88px] px-2 sm:px-3 pt-1.5 pb-2 flex-shrink-0"
              >
                <span className="flex items-center gap-1.5">
                  <Icon className={`w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] transition-colors duration-200 ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
                  <span className={`text-[12px] sm:text-[13px] font-semibold whitespace-nowrap transition-colors duration-200 ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {tab.label}
                  </span>
                  {tab.path === '/' && totalUnread > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </span>
                {active && (
                  <motion.div
                    layoutId="topnav-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-[3px] rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] shadow-[0_0_12px_var(--accent-glow)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>

      <SearchUsers isOpen={searchOpen} onClose={() => setSearchOpen(false)} onConversationCreated={handleConversationCreated} />
    </header>
  );
}
