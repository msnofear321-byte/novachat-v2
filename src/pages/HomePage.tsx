import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { HiOutlineMagnifyingGlass, HiOutlineXMark, HiOutlineUserGroup, HiOutlinePencilSquare, HiOutlineShieldCheck, HiOutlineArrowRight } from 'react-icons/hi2';
import ChatList from '@/components/ChatList';
import ChatPage from '@/components/ChatPage';
import GroupChatPage from '@/components/GroupChatPage';
import GroupCreator from '@/components/GroupCreator';
import MusicNotesStrip from '@/components/MusicNotesStrip';
import { useUnread } from '@/context/UnreadContext';
import { useAuth } from '@/context/AuthContext';
import { getAllUsers, searchUsers } from '@/services/firestore';
import { openConversationWithUser } from '@/utils/chatNavigation';
import { isOnlineNow } from '@/services/presence';
import { isPhoneQuery } from '@/utils/phone';
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
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = searchParams.get('c') || undefined;
  const [chatListKey, setChatListKey] = useState(0);
  const isMobile = useIsMobile();
  const { setTotalUnread } = useUnread();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [groupCreatorOpen, setGroupCreatorOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (activeConversationId || isMobile) return;
    setUsersLoading(true);
    getAllUsers().then((users) => { setAllUsers(users); setUsersLoading(false); }).catch(() => setUsersLoading(false));
  }, [activeConversationId, isMobile]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setUserResults([]);
      setSearchingUsers(false);
      return;
    }
    setSearchingUsers(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const users = await searchUsers(q);
        setUserResults(users);
      } catch (e) {
        console.error('searchUsers failed:', e);
        setUserResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  const openConversation = useCallback(async (otherUserId: string) => {
    if (!currentUser) return;
    setStartError(null);
    setOpeningUserId(otherUserId);
    try {
      const convId = await openConversationWithUser(currentUser.uid, otherUserId);
      setSearchParams({ c: convId });
      setChatListKey((k) => k + 1);
      setQuery('');
    } catch (e) {
      console.error('Failed to start chat:', e);
      setStartError('Couldn\u2019t start the chat. Please try again.');
    } finally {
      setOpeningUserId(null);
    }
  }, [currentUser, setSearchParams]);

  const handleConversationDeleted = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleBack = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleGroupCreated = useCallback((id: string) => {
    setGroupCreatorOpen(false);
    if (id.startsWith('group_')) {
      navigate(`/group/${id}`);
    } else {
      setSearchParams({ c: id });
      setChatListKey((k) => k + 1);
    }
  }, [navigate, setSearchParams]);

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
        {/* Search bar */}
        <div className="flex-shrink-0 px-3 sm:px-4 pt-3 sm:pt-3.5 pb-2">
          <div className="relative flex items-center gap-3 rounded-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] px-4 py-3 focus-within:border-[var(--border-accent)] focus-within:ring-2 focus-within:ring-[var(--accent-glow)] transition-all">
            <HiOutlineMagnifyingGlass className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats, users or phone number..."
              className="flex-1 bg-transparent text-[var(--text-primary)] text-[14px] sm:text-[15px] placeholder-[var(--text-muted)] focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors flex-shrink-0">
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            )}
          </div>
          {startError && (
            <p className="mt-1.5 px-1 text-[11px] text-[var(--danger)]">{startError}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
          {query.trim() ? (
            <div>
              <div className="px-5 pt-1 pb-1.5 flex items-center gap-2">
                <span className="section-label">People</span>
              </div>
              {searchingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
                </div>
              ) : userResults.length > 0 ? (
                userResults.map((u) => (
                  <button
                    key={u.uid}
                    onClick={() => openConversation(u.uid)}
                    disabled={openingUserId === u.uid}
                    className="w-full flex items-center gap-3.5 px-5 py-3 text-left hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg-strong)] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <UserAvatar photoURL={u.photoURL} displayName={u.displayName || '?'} size="md" online={isOnlineNow(u)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text-primary)] text-[15px] truncate">{u.displayName}</p>
                      {u.phone
                        ? <p className="text-[var(--text-secondary)] text-[12px] truncate">{u.phone}</p>
                        : u.email && <p className="text-[var(--text-secondary)] text-[12px] truncate">{u.email}</p>}
                    </div>
                    {openingUserId === u.uid ? (
                      <div className="w-5 h-5 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <HiOutlineUserGroup className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-[var(--text-secondary)] text-[13px]">No users found</p>
                  <p className="text-[var(--text-muted)] text-[12px] mt-1">
                    {isPhoneQuery(query) ? 'No NovaChat user found with that phone number' : 'Try a name, phone number or user ID'}
                  </p>
                </div>
              )}
              <div className="px-5 pt-3 pb-1.5 flex items-center gap-2">
                <span className="section-label">Chats</span>
              </div>
              <ChatList
                searchQuery={query}
                activeConversationId={activeConversationId}
                refreshKey={chatListKey}
                onTotalUnreadChange={setTotalUnread}
              />
            </div>
          ) : (
            <>
              <div className="px-3 sm:px-4 pt-2 pb-1">
                <div className="flex items-stretch gap-2.5 overflow-x-auto scrollbar-hidden">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate('/notes')}
                    className="flex-1 min-w-[170px] max-w-[240px] flex items-center gap-3 rounded-[18px] bg-[var(--bg-card)] border border-[var(--border-primary)] px-4 py-4 text-left hover:border-[var(--border-accent)] hover:shadow-[var(--shadow-md)] transition-all duration-200 ease-out"
                  >
                    <div className="w-11 h-11 rounded-[13px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center flex-shrink-0 shadow-[var(--accent-shadow)]">
                      <HiOutlinePencilSquare className="w-[22px] h-[22px] text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[15px] text-[var(--text-primary)] truncate">My Notes</p>
                      <p className="text-[12px] text-[var(--text-muted)] truncate">Your private notes</p>
                    </div>
                    <HiOutlineArrowRight className="w-4 h-4 text-[var(--text-muted)] ml-auto flex-shrink-0" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate('/secret')}
                    className="flex-1 min-w-[170px] max-w-[240px] flex items-center gap-3 rounded-[18px] bg-[var(--bg-card)] border border-[var(--border-primary)] px-4 py-4 text-left hover:border-[var(--border-accent)] hover:shadow-[var(--shadow-md)] transition-all duration-200 ease-out"
                  >
                    <div className="w-11 h-11 rounded-[13px] bg-gradient-to-br from-[var(--accent-secondary)] to-[var(--accent-gradient-end)] flex items-center justify-center flex-shrink-0 shadow-[var(--accent-shadow)]">
                      <HiOutlineShieldCheck className="w-[22px] h-[22px] text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[15px] text-[var(--text-primary)] truncate">Secret</p>
                      <p className="text-[12px] text-[var(--text-muted)] truncate">Private chat</p>
                    </div>
                    <HiOutlineArrowRight className="w-4 h-4 text-[var(--text-muted)] ml-auto flex-shrink-0" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: -2 }}
                    onClick={() => setGroupCreatorOpen(true)}
                    className="flex-1 min-w-[170px] max-w-[240px] flex items-center gap-3 rounded-[18px] bg-[var(--bg-card)] border border-[var(--border-primary)] px-4 py-4 text-left hover:border-[var(--border-accent)] hover:shadow-[var(--shadow-md)] transition-all duration-200 ease-out"
                  >
                    <div className="w-11 h-11 rounded-[13px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] flex items-center justify-center flex-shrink-0 shadow-[var(--accent-shadow)]">
                      <HiOutlineUserGroup className="w-[22px] h-[22px] text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[15px] text-[var(--text-primary)] truncate">New Group</p>
                      <p className="text-[12px] text-[var(--text-muted)] truncate">Start a group</p>
                    </div>
                    <HiOutlineArrowRight className="w-4 h-4 text-[var(--text-muted)] ml-auto flex-shrink-0" />
                  </motion.button>
                </div>
              </div>
              <MusicNotesStrip />
              <ChatList
                searchQuery=""
                activeConversationId={activeConversationId}
                refreshKey={chatListKey}
                onTotalUnreadChange={setTotalUnread}
              />
            </>
          )}
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
            {activeConversationId.startsWith('group_') ? (
              <GroupChatPage
                groupId={activeConversationId}
                key={activeConversationId}
                onBack={isMobile ? handleBack : undefined}
              />
            ) : (
              <ChatPage
                conversationId={activeConversationId}
                key={activeConversationId}
                onBack={isMobile ? handleBack : undefined}
                onConversationDeleted={handleConversationDeleted}
              />
            )}
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
                      <button
                        key={u.uid || `${u.displayName || 'user'}-${u.email || 'no-email'}`}
                        onClick={() => openConversation(u.uid)}
                        disabled={openingUserId === u.uid}
                        className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg-strong)] transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <UserAvatar photoURL={u.photoURL} displayName={u.displayName || '?'} size="md" />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{u.displayName}</p>
                          {u.email && <p className="text-[12px] text-[var(--text-muted)] truncate">{u.email}</p>}
                        </div>
                        {openingUserId === u.uid && (
                          <div className="w-5 h-5 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <GroupCreator isOpen={groupCreatorOpen} onClose={() => setGroupCreatorOpen(false)} onGroupCreated={handleGroupCreated} />
    </div>
  );
}
