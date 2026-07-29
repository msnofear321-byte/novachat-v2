import { formatLastSeen } from '@/utils/format';
import UserAvatar from '@/components/UserAvatar';
import type { Conversation, User } from '@/types';
import { motion } from 'framer-motion';
import { HiOutlineMapPin, HiOutlineBellSlash } from 'react-icons/hi2';

interface ChatItemProps {
  conversation: Conversation;
  otherUser: User | undefined;
  isActive: boolean;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
  isTyping?: boolean;
}

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

export default function ChatItem({ conversation, otherUser, isActive, onClick, onPin: _onPin, onDelete: _onDelete, isTyping }: ChatItemProps) {
  void formatLastSeen;
  const isOnline = otherUser?.status === 'online';
  const lastMsg = conversation.lastMessage || 'No messages yet';

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative flex items-center gap-3.5 px-4 py-3 cursor-pointer transition-all duration-200 border-b border-[var(--border-secondary)] ${
        isActive
          ? 'bg-[var(--accent-primary)]/8 border-l-2 border-l-[var(--accent-primary)]'
          : 'hover:bg-[var(--hover-bg)] border-l-2 border-l-transparent'
      }`}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar
          photoURL={otherUser?.photoURL}
          displayName={otherUser?.displayName || '?'}
          size="md"
          online={isOnline}
        />
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--success)] border-2 border-[var(--bg-sidebar)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className={`font-semibold text-[15px] truncate ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
            {otherUser?.displayName || 'Unknown'}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {conversation.pinned && (
              <HiOutlineMapPin className="w-3.5 h-3.5 text-[var(--accent-primary)] rotate-45" />
            )}
            {conversation.muted && (
              <HiOutlineBellSlash className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
            <span className={`text-[11px] flex-shrink-0 ${
              conversation.unreadCount > 0 ? 'text-[var(--accent-primary)] font-medium' : 'text-[var(--text-muted)]'
            }`}>
              {conversation.lastMessageTime ? formatChatTime(conversation.lastMessageTime) : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {isTyping ? (
            <div className="flex items-center gap-1.5">
              <span className="typing-dots">
                <span /><span /><span />
              </span>
              <span className="text-[13px] text-[var(--accent-primary)] font-medium">typing...</span>
            </div>
          ) : (
            <p className={`text-[13px] truncate flex-1 min-w-0 mr-2 ${
              conversation.unreadCount > 0 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
            }`}>
              {lastMsg}
            </p>
          )}
          {conversation.unreadCount > 0 && (
            <span className="glow-badge flex-shrink-0">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
