import { motion } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';

interface ReplyPreviewProps {
  replyTo: {
    id: string;
    text: string;
    senderId: string;
    type: string;
  } | null;
  onCancel: () => void;
  otherUserName?: string;
}

export default function ReplyPreview({ replyTo, onCancel, otherUserName }: ReplyPreviewProps) {
  const { user } = useAuth();
  if (!replyTo) return null;
  const isOwn = replyTo.senderId === user?.uid;
  return (
    <motion.div initial={{ opacity: 0, y: 8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 8, height: 0 }}
      className="mx-3 sm:mx-4 mb-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--accent-primary)]/8 border border-[var(--accent-primary)]/15 rounded-[12px] sm:rounded-[14px] flex items-center gap-2 sm:gap-3">
      <div className="w-0.5 h-8 bg-[var(--accent-primary)] rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[var(--accent-primary)]">
          {isOwn ? 'You' : otherUserName || 'User'}
        </p>
        <p className="text-[13px] text-[var(--text-secondary)] truncate">
          {replyTo.type === 'text' ? replyTo.text : `📎 ${replyTo.type}`}
        </p>
      </div>
      <button onClick={onCancel} aria-label="Cancel reply" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-all flex-shrink-0">
        <HiOutlineXMark className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
