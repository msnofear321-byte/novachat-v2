import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineMapPin,
  HiOutlineBellSlash,
  HiOutlineArchiveBox,
  HiOutlineTrash,
  HiOutlineInformationCircle,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';
import { togglePinConversation, toggleMuteConversation, toggleArchiveConversation, clearChat, deleteConversation } from '@/services/firestore';
import type { Conversation, User } from '@/types';

interface ChatItemActionsProps {
  conversation: Conversation;
  otherUser?: User;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
}

type ConfirmAction = 'clear' | 'delete' | null;

export default function ChatItemActions({ conversation, otherUser, isOpen, onClose, onOpenChat }: ChatItemActionsProps) {
  const { user: currentUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirm(null);
      setError(null);
    }
  }, [isOpen, conversation.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!currentUser) return null;

  const isGroup = conversation.type === 'group';
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onClose();
    } catch (e) {
      console.error('Chat action failed:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => {
    if (confirm === 'clear') {
      run(() => clearChat(conversation.id));
    } else if (confirm === 'delete') {
      run(() => deleteConversation(conversation.id));
    }
  };

  const actionBtn =
    'w-full flex items-center gap-3.5 px-4 py-3 rounded-[12px] text-left text-[14px] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg-strong)] transition-colors disabled:opacity-50';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-8 sm:w-full sm:max-w-[360px] rounded-t-[24px] sm:rounded-[24px] bg-[var(--bg-card)] border border-[var(--border-primary)] shadow-[var(--shadow-xl)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
                  {isGroup ? 'G' : (otherUser?.displayName?.[0]?.toUpperCase() || '?')}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                    {isGroup ? (conversation.name || 'Group') : (otherUser?.displayName || 'Chat')}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">{isGroup ? 'Group chat' : otherUser?.email}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors flex-shrink-0"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {confirm ? (
              <div className="p-4">
                <div className="rounded-[16px] bg-[var(--danger-bg)] border border-[var(--danger)]/20 p-4 mb-4">
                  <p className="text-[14px] font-semibold text-[var(--danger)] mb-1">
                    {confirm === 'clear' ? 'Clear chat?' : 'Delete chat?'}
                  </p>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    {confirm === 'clear'
                      ? 'This will permanently delete all messages in this chat for you.'
                      : 'This will permanently delete the conversation and all its messages.'}
                  </p>
                </div>
                {error && <p className="mb-3 text-[12px] text-[var(--danger)]">{error}</p>}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setConfirm(null)}
                    disabled={busy}
                    className="flex-1 py-2.5 rounded-[12px] text-[13px] font-medium bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={busy}
                    className="flex-1 py-2.5 rounded-[12px] text-[13px] font-semibold bg-[var(--danger)] text-white hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                  >
                    {busy && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    {confirm === 'clear' ? 'Clear' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
                {error && <p className="px-4 pt-2 text-[12px] text-[var(--danger)]">{error}</p>}
                {!isGroup && onOpenChat && (
                  <button onClick={() => { onClose(); onOpenChat(); }} className={actionBtn}>
                    <HiOutlineInformationCircle className="w-5 h-5 text-[var(--accent-primary)] flex-shrink-0" />
                    Chat Info
                  </button>
                )}
                <button
                  onClick={() => run(() => togglePinConversation(conversation.id, !conversation.pinned))}
                  disabled={busy}
                  className={actionBtn}
                >
                  <HiOutlineMapPin className={`w-5 h-5 flex-shrink-0 ${conversation.pinned ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
                  {conversation.pinned ? 'Unpin Chat' : 'Pin Chat'}
                </button>
                <button
                  onClick={() => run(() => toggleMuteConversation(conversation.id, !conversation.muted))}
                  disabled={busy}
                  className={actionBtn}
                >
                  <HiOutlineBellSlash className={`w-5 h-5 flex-shrink-0 ${conversation.muted ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
                  {conversation.muted ? 'Unmute Notifications' : 'Mute Notifications'}
                </button>
                <button
                  onClick={() => run(() => toggleArchiveConversation(conversation.id, !conversation.archived))}
                  disabled={busy}
                  className={actionBtn}
                >
                  <HiOutlineArchiveBox className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                  {conversation.archived ? 'Unarchive Chat' : 'Archive Chat'}
                </button>
                <div className="my-1.5 h-px bg-[var(--border-primary)]" />
                <button onClick={() => setConfirm('clear')} disabled={busy} className={actionBtn}>
                  <HiOutlineTrash className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
                  Clear Chat
                </button>
                <button onClick={() => setConfirm('delete')} disabled={busy} className={actionBtn}>
                  <HiOutlineTrash className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
                  Delete Chat
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
