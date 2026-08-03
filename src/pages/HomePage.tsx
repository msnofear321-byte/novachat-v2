import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import ChatList from '@/components/ChatList';
import ChatPage from '@/components/ChatPage';
import MusicNotesStrip from '@/components/MusicNotesStrip';
import { useUnread } from '@/context/UnreadContext';
import { getAllUsers, createConversation } from '@/services/firestore';
import UserAvatar from '@/components/UserAvatar';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = searchParams.get('c') || undefined;
  const [chatListKey, setChatListKey] = useState(0);
  const isMobile = useIsMobile();
  const { setTotalUnread } = useUnread();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (activeConversationId || isMobile) return;
    setUsersLoading(true);
    getAllUsers().then((users) => { setAllUsers(users); setUsersLoading(false); }).catch(() => setUsersLoading(false));
  }, [activeConversationId, isMobile]);

  const handleConversationDeleted = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleBack = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return (
    <div className="h-full flex bg-[var(--bg-primary)] overflow-hidden overflow-x-hidden">
      {/* Chat list panel */}
      <div
        className={`flex-shrink-0 h-full border-r border-[var(--border-primary)] flex-col bg-[var(--bg-sidebar)] ${
          isMobile
            ? activeConversationId
              ? 'hidden'
              : 'flex w-full'
            : 'flex w-[320px] lg:w-[380px]'
        }`}
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
          <MusicNotesStrip />
          <ChatList
            searchQuery=""
            activeConversationId={activeConversationId}
            refreshKey={chatListKey}
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
                        key={u.uid || `${u.displayName || 'user'}-${u.email || 'no-email'}`}
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
    </div>
  );
}
