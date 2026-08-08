import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineEye,
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
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] sm:rounded-[13px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] flex items-center justify-center shadow-[var(--accent-shadow)] flex-shrink-0">
            <svg className="w-[22px] h-[22px] sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-fluid-brand font-extrabold tracking-tight text-[var(--text-primary)] truncate">
            NovaChat
          </span>
        </motion.button>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchOpen(true)}
            aria-label="Search users"
            className="w-12 h-12 rounded-[13px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-all"
          >
            <HiOutlineMagnifyingGlass className="w-[22px] h-[22px] sm:w-6 sm:h-6" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/profile')}
            aria-label="Open profile"
            className="w-12 h-12 flex items-center justify-center"
          >
            <UserAvatar photoURL={user?.photoURL ?? undefined} displayName={user?.displayName || '?'} size="md" />
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="app-topnav-tabs px-2 sm:px-4 pb-2">
        <div className="flex items-stretch gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab.path, location.pathname);
            return (
              <motion.button
                key={tab.path}
                whileTap={{ scale: 0.94 }}
                onClick={() => navigate(tab.path)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center justify-center gap-2 px-4 sm:px-5 h-[52px] sm:h-14 rounded-full flex-1 min-w-0 transition-colors duration-200 ${
                  active
                    ? 'text-[var(--accent-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="topnav-active-pill"
                    className="absolute inset-0 rounded-full bg-[var(--accent-primary)]/12 border border-[var(--accent-primary)]/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className={`relative w-[22px] h-[22px] transition-colors duration-200 ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
                <span className={`relative text-[14px] sm:text-[15px] font-semibold whitespace-nowrap transition-colors duration-200 ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                  {tab.label}
                </span>
                {tab.path === '/' && totalUnread > 0 && (
                  <span className="relative min-w-[16px] h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold flex items-center justify-center">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
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
