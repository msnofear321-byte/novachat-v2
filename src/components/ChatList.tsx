import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { subscribeToConversations, subscribeToTypingStatus } from '@/services/firestore';
import { isOnlineNow, PRESENCE_TICK_MS } from '@/services/presence';
import { getDisplayName } from '@/utils/userDisplay';
import { getConversationOtherId } from '@/utils/chatNavigation';
import { useAuth } from '@/context/AuthContext';
import { useUserProfiles } from '@/hooks/useUserProfiles';
import ChatItem from '@/components/ChatItem';
import ChatItemActions from '@/components/ChatItemActions';
import type { Conversation } from '@/types';

interface ChatListProps {
  searchQuery: string;
  activeConversationId?: string;
  refreshKey?: number;
  onSearchOpen?: () => void;
  totalUnread?: number;
  onTotalUnreadChange?: (count: number) => void;
}

/**
 * Resolve the other participant's UID for a 1:1 conversation. The participants
 * array is the source of truth (with a `|`-scheme id fallback before the doc
 * loads). Self-conversations resolve to the current user's own UID; malformed
 * docs with no participants resolve to undefined (row shows a skeleton).
 */
function resolveOtherId(c: Conversation, myUid?: string): string | undefined {
  if (c.type === 'group') return undefined;
  const other = getConversationOtherId(c.id, myUid, c);
  if (other) return other;
  const parts = c.participants ?? [];
  if (parts.length === 0) return undefined;
  const allSelf = myUid ? parts.every((p) => p === myUid) : false;
  return allSelf ? parts[0] : undefined;
}

export default function ChatList({ searchQuery, activeConversationId, refreshKey, onSearchOpen: _onSearchOpen, onTotalUnreadChange }: ChatListProps) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(() => Date.now());
  const [menuTarget, setMenuTarget] = useState<Conversation | null>(null);

  // Realtime conversation/message listener: any sent message (even with the
  // chat closed) updates lastMessage, timestamp, unread and sorting immediately.
  useEffect(() => {
    const unsub = subscribeToConversations((convs) => {
      setConversations(convs);
      const totalUnread = convs.reduce((sum, c) => {
        const u = c.unreadByUser?.[currentUser?.uid || ''] ?? c.unreadCount ?? 0;
        return sum + (c.lastMessageSenderId === currentUser?.uid ? 0 : u);
      }, 0);
      onTotalUnreadChange?.(totalUnread);
    });
    return unsub;
  }, [currentUser?.uid, refreshKey, onTotalUnreadChange]);

  // Re-evaluate effective online state on a short tick so a heartbeat that
  // went stale (no writes happening) flips the green dot offline within seconds.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), PRESENCE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Collect the unique UIDs this list needs profiles for, then resolve each
  // through the shared ref-counted resolver. Every row resolves its own UID;
  // profiles stay cached and realtime across remounts and duplicate listeners.
  const otherIds = useMemo(() => {
    const ids = new Set<string>();
    conversations.forEach((c) => {
      const other = resolveOtherId(c, currentUser?.uid);
      if (other) ids.add(other);
    });
    return [...ids];
  }, [conversations, currentUser?.uid]);

  const userMap = useUserProfiles(otherIds);

  useEffect(() => {
    if (!currentUser) return;
    const unsubs = conversations.map((c) => {
      const otherId = resolveOtherId(c, currentUser.uid);
      if (!otherId) return () => {};
      return subscribeToTypingStatus(otherId, c.id, (active) => {
        setTypingMap((prev) => ({ ...prev, [c.id]: active }));
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [currentUser, conversations]);

  const handleSelect = useCallback((id: string) => {
    navigate(`/?c=${id}`);
  }, [navigate]);

  const handleOpenMenu = useCallback((id: string) => {
    const c = conversations.find((x) => x.id === id);
    if (c) setMenuTarget(c);
  }, [conversations]);

  const pinned = conversations.filter((c) => c.pinned);
  const unpinned = conversations.filter((c) => !c.pinned);

  const filter = (convs: Conversation[]) =>
    searchQuery.trim()
      ? convs.filter((c) => {
          if (c.type === 'group') {
            return (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
          }
          const otherId = resolveOtherId(c, currentUser?.uid);
          const u = otherId ? userMap[otherId] : undefined;
          return (u ? getDisplayName(u).toLowerCase().includes(searchQuery.toLowerCase()) : false) || c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
        })
      : convs;

  const filteredPinned = filter(pinned);
  const filteredUnpinned = filter(unpinned);

  const renderItem = (c: Conversation) => {
    const isGroup = c.type === 'group';
    const otherId = isGroup ? undefined : resolveOtherId(c, currentUser?.uid);
    const otherUser = otherId ? userMap[otherId] : undefined;
    return (
      <ChatItem
        key={c.id}
        conversation={c}
        otherUser={otherUser}
        online={isGroup ? false : isOnlineNow(otherUser, now)}
        isActive={c.id === activeConversationId}
        onSelect={handleSelect}
        isTyping={typingMap[c.id]}
        onOpenMenu={handleOpenMenu}
      />
    );
  };

  if (conversations.length === 0 && !searchQuery.trim()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-[80px] h-[80px] rounded-[24px] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center mb-5"
        >
          <svg className="w-10 h-10 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </motion.div>
        <h3 className="font-semibold text-[var(--text-primary)] text-[17px] mb-1.5">No conversations yet</h3>
        <p className="text-[var(--text-secondary)] text-[14px] text-center leading-relaxed">Tap the search icon to find<br/>people and start chatting</p>
      </div>
    );
  }

  if (filteredPinned.length === 0 && filteredUnpinned.length === 0 && searchQuery.trim()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
        <div className="w-[60px] h-[60px] rounded-[16px] bg-[var(--hover-bg)] flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <p className="text-[var(--text-secondary)] text-[14px]">No chats matching &ldquo;{searchQuery}&rdquo;</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } } }}
        className="flex-1 overflow-y-auto custom-scrollbar momentum-scroll gpu-hint"
      >
        {filteredPinned.map(renderItem)}
        {filteredUnpinned.map(renderItem)}
      </motion.div>
      {menuTarget && (
        <ChatItemActions
          conversation={menuTarget}
          otherUser={(() => {
            const oid = menuTarget.type === 'group' ? undefined : resolveOtherId(menuTarget, currentUser?.uid);
            return oid ? userMap[oid] : undefined;
          })()}
          isOpen={!!menuTarget}
          onClose={() => setMenuTarget(null)}
          onOpenChat={() => {
            setMenuTarget(null);
            navigate(`/?c=${menuTarget.id}`);
          }}
        />
      )}
    </>
  );
}
