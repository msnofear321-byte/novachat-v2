import { memo, useRef } from 'react';
import UserAvatar from '@/components/UserAvatar';
import { isOnlineNow } from '@/services/presence';
import { useAuth } from '@/context/AuthContext';
import type { Conversation, User } from '@/types';
import { motion } from 'framer-motion';
import { HiOutlineMapPin, HiOutlineBellSlash, HiOutlineUserGroup } from 'react-icons/hi2';

interface ChatItemProps {
  conversation: Conversation;
  otherUser: User | undefined;
  online?: boolean;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
  isTyping?: boolean;
  onOpenMenu?: (conversationId: string) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function formatChatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    now.getDate() - date.getDate() === 1 &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();

  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return 'Yesterday';
  if (diff < dayMs * 6) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ChatItem({ conversation, otherUser, online, isActive, onSelect, isTyping, onOpenMenu }: ChatItemProps) {
  const { user } = useAuth();
  const isGroup = conversation.type === 'group';
  const isOnline = isGroup ? false : (online ?? isOnlineNow(otherUser));
  const lastMsg = conversation.lastMessage || 'No messages yet';
  const title = isGroup ? (conversation.name || 'Group') : (otherUser?.displayName || 'Unknown');

  // Prefer per-user unread. If the last message in the conversation is our own
  // we have already read everything up to it, so hide the badge.
  const rawUnread = conversation.unreadByUser?.[user?.uid || ''] ?? conversation.unreadCount ?? 0;
  const unread = conversation.lastMessageSenderId === user?.uid ? 0 : rawUnread;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !onOpenMenu) return;
    longPressFired.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      navigator.vibrate?.(12);
      onOpenMenu(conversation.id);
    }, 450);
  };

  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onSelect(conversation.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onOpenMenu) return;
    e.preventDefault();
    clearLongPress();
    longPressFired.current = true;
    onOpenMenu(conversation.id);
  };

  return (
    <motion.div
      layout
      variants={itemVariants}
      transition={{ layout: { type: 'spring', stiffness: 420, damping: 34 } }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
      onContextMenu={handleContextMenu}
      className={`group relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-3.5 cursor-pointer select-none touch-manipulation transition-all duration-200 ${
        isActive
          ? 'bg-[var(--accent-primary)]/10'
          : 'hover:bg-[var(--hover-bg)]'
      }`}
    >
      {isActive && (
        <motion.span
          layoutId="active-chat-bar"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 sm:h-8 rounded-r-full bg-[var(--accent-primary)]"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <div className="relative flex-shrink-0">
        {isGroup ? (
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 flex items-center justify-center">
            <HiOutlineUserGroup className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        ) : (
          <UserAvatar
            photoURL={otherUser?.photoURL}
            displayName={otherUser?.displayName || '?'}
            size="md"
            online={isOnline}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-semibold text-[15px] sm:text-[17px] truncate ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
            {title}
          </h3>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-2">
            {conversation.pinned && (
              <HiOutlineMapPin className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[var(--accent-primary)] rotate-45" />
            )}
            {conversation.muted && (
              <HiOutlineBellSlash className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[var(--text-muted)]" />
            )}
            <span className={`text-[11px] sm:text-[12px] flex-shrink-0 ${
              unread > 0 ? 'text-[var(--accent-primary)] font-medium' : 'text-[var(--text-muted)]'
            }`}>
              {conversation.lastMessageTime ? formatChatTime(conversation.lastMessageTime) : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {isTyping ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="typing-dots">
                <span /><span /><span />
              </span>
              <span className="text-[13px] sm:text-[14px] text-[var(--accent-primary)] font-medium">typing...</span>
            </div>
          ) : (
            <p className={`text-[13px] sm:text-[14px] truncate flex-1 min-w-0 mr-2 ${
              unread > 0 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
            }`}>
              {lastMsg}
            </p>
          )}
          {unread > 0 && (
            <span className="glow-badge flex-shrink-0">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ChatItem);
