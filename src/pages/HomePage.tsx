import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import SearchUsers from '@/components/SearchUsers';
import ChatList from '@/components/ChatList';
import ChatPage from '@/components/ChatPage';
import MobileBottomNav from '@/components/MobileBottomNav';
import MusicNotesStrip from '@/components/MusicNotesStrip';
import { useAuth } from '@/context/AuthContext';
import { getAllUsers, createConversation } from '@/services/firestore';
import UserAvatar from '@/components/UserAvatar';
import { HiOutlineMagnifyingGlass, HiOutlineCog6Tooth } from 'react-icons/hi2';
import { useNavigate } from 'react-router';
import type { User } from '@/types';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = searchParams.get('c') || undefined;
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatListKey, setChatListKey] = useState(0);
  const isMobile = useIsMobile();
  const [totalUnread, setTotalUnread] = useState(0);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (activeConversationId || isMobile) return;
    setUsersLoading(true);
    getAllUsers().then((users) => { setAllUsers(users); setUsersLoading(false); }).catch(() => setUsersLoading(false));
  }, [activeConversationId, isMobile]);

  const handleConversationCreated = useCallback((id: string) => {
    if (id.startsWith('group_')) {
      navigate(`/group/${id}`);
    } else {
      setSearchParams({ c: id });
      setChatListKey((k) => k + 1);
    }
  }, [setSearchParams, navigate]);

  const handleConversationDeleted = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleBack = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return (
    <div className="h-[100dvh] md:h-screen flex bg-[var(--bg-primary)] overflow-hidden safe-area-top">
      {/* Desktop sidebar navigation */}
      <div className="hidden md:flex">
        <Sidebar
          onOpenSearch={() => setSearchOpen(true)}
          totalUnread={totalUnread}
        />
      </div>

      {/* Chat list panel */}
      <div
        className={`flex-shrink-0 h-full border-r border-[var(--border-primary)] flex-col bg-[var(--bg-sidebar)] ${
          isMobile
            ? activeConversationId
              ? 'hidden'
              : 'flex w-full pb-[56px]'
            : 'flex w-[320px] lg:w-[380px]'
        }`}
      >
        {/* Header with profile + search */}
        <div className="px-4 pt-4 pb-2">
          {/* Top row: Avatar + title + settings */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/profile')} className="relative">
                <UserAvatar photoURL={user?.photoURL ?? undefined} displayName={user?.displayName || '?'} size="sm" online />
              </button>
              <h2 className="text-[20px] font-bold text-[var(--text-primary)]">Chats</h2>
              {totalUnread > 0 && (
                <span className="glow-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/settings')}
                className="w-9 h-9 rounded-[11px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-all"
              >
                <HiOutlineCog6Tooth className="w-[20px] h-[20px]" />
              </motion.button>
            </div>
          </div>

          {/* Search bar */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-muted)] text-[13px] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--hover-bg)] transition-all duration-200"
          >
            <HiOutlineMagnifyingGlass className="w-4 h-4 flex-shrink-0" />
            <span>Search users to chat...</span>
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <MusicNotesStrip />
          <ChatList
            searchQuery=""
            activeConversationId={activeConversationId}
            refreshKey={chatListKey}
            onSearchOpen={() => setSearchOpen(true)}
            onTotalUnreadChange={setTotalUnread}
          />
        </div>
      </div>

      {/* Chat page panel */}
      <div
        className={`flex-1 h-full min-w-0 ${
          isMobile
            ? activeConversationId
              ? 'flex'
              : 'hidden'
            : 'flex'
        }`}
      >
        {activeConversationId ? (
          <div className="flex-1 h-full min-w-0">
            <ChatPage
              conversationId={activeConversationId}
              key={activeConversationId}
              onBack={isMobile ? handleBack : undefined}
              onSearchOpen={() => setSearchOpen(true)}
              onConversationDeleted={handleConversationDeleted}
            />
          </div>
        ) : (
          !isMobile && (
            <div className="h-full flex flex-col bg-[var(--bg-chat)] flex-1">
              <div className="px-6 pt-6 pb-3 border-b border-[var(--border-primary)]">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)]">People</h3>
                <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Start a new conversation</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {usersLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : allUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <p className="text-[var(--text-muted)] text-[14px]">No other users found</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {allUsers.map((u) => (
                      <motion.button
                        key={u.uid}
                        whileHover={{ backgroundColor: 'var(--hover-bg)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          try {
                            const convId = await createConversation(u.uid);
                            setSearchParams({ c: convId });
                            setChatListKey((k) => k + 1);
                          } catch (e) {
                            console.error('Failed to start chat:', e);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-6 py-3 text-left transition-colors"
                      >
                        <UserAvatar photoURL={u.photoURL} displayName={u.displayName || '?'} size="md" />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{u.displayName}</p>
                          {u.email && <p className="text-[12px] text-[var(--text-muted)] truncate">{u.email}</p>}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <SearchUsers isOpen={searchOpen} onClose={() => setSearchOpen(false)} onConversationCreated={handleConversationCreated} />

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        onOpenSearch={() => setSearchOpen(true)}
        totalUnread={totalUnread}
      />

    </div>
  );
}
