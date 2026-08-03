import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';
import { searchUsers, sendMessage, createConversation } from '@/services/firestore';
import { isOnlineNow } from '@/services/presence';
import UserAvatar from '@/components/UserAvatar';
import type { Message, User } from '@/types';

interface ForwardModalProps {
  message: Message;
  onClose: () => void;
}

export default function ForwardModal({ message, onClose }: ForwardModalProps) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await searchUsers(query);
        setResults(users);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleForward(targetUser: User) {
    if (!currentUser || sent) return;
    setSending(targetUser.uid);
    try {
      const convId = await createConversation(targetUser.uid);
      const msgData: Record<string, unknown> = {
        conversationId: convId,
        senderId: currentUser.uid,
        receiverId: targetUser.uid,
        text: message.text || `Forwarded ${message.type}`,
        createdAt: Date.now(),
        read: false,
        delivered: false,
        type: message.type,
        starred: false,
        deleted: false,
        forwarded: true,
      };
      if (message.mediaURL) msgData.mediaURL = message.mediaURL;
      if (message.fileName) msgData.fileName = message.fileName;
      if (message.fileSize) msgData.fileSize = message.fileSize;
      if (message.mimeType) msgData.mimeType = message.mimeType;
      await sendMessage(convId, msgData as Omit<Message, 'id'>);
      setSent(true);
      setTimeout(onClose, 800);
    } finally {
      setSending(null);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="w-full max-w-[420px] glass-premium rounded-[20px] sm:rounded-[24px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Forward Message</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-all">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-[var(--border-primary)]">
          <p className="text-[13px] text-[var(--text-secondary)] truncate italic">
            {message.type === 'text' ? message.text : `📎 ${message.type}`}
          </p>
        </div>
        <div className="px-5 py-3 border-b border-[var(--border-primary)]">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users..."
            className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[var(--text-primary)] text-[13px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-all" />
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {searching && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
            </div>
          )}
          {!searching && results.length === 0 && query.trim() && (
            <div className="py-8 text-center text-[var(--text-muted)] text-[13px]">No users found</div>
          )}
          {!searching && !query.trim() && (
            <div className="py-8 text-center text-[var(--text-muted)] text-[13px]">Type to search for users</div>
          )}
          {results.map((u) => (
            <button key={u.uid} onClick={() => handleForward(u)} disabled={sending === u.uid || sent}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[var(--hover-bg)] transition-all disabled:opacity-50">
              <UserAvatar photoURL={u.photoURL} displayName={u.displayName} size="md" online={isOnlineNow(u)} />
              <div className="text-left flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] text-[14px] truncate">{u.displayName}</p>
              </div>
              {sending === u.uid && <div className="w-4 h-4 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />}
              {sent && sending === null && <span className="text-[var(--success)] text-[12px] font-medium">Sent!</span>}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
