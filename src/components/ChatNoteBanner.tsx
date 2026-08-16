import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { subscribeToNote, isNoteActive, formatExpiresIn, type ChatNote } from '@/services/tempNotes';

interface ChatNoteBannerProps {
  userId?: string;
}

/**
 * Compact banner rendered ABOVE the chat profile/header showing the other
 * user's active note. Disappears automatically the moment the note expires,
 * without a page refresh, and renders nothing when there is no active note.
 */
export default function ChatNoteBanner({ userId }: ChatNoteBannerProps) {
  const [note, setNote] = useState<ChatNote | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNote(null);
    setUnavailable(false);
    if (!userId) return;
    let retried = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryCleanup: (() => void) | undefined;
    const unsub = subscribeToNote(userId, setNote, () => {
      // Surface subscription failures (e.g. stale deployed Firestore rules
      // that deny cross-user reads) instead of silently hiding the banner.
      if (retried) {
        setUnavailable(true);
        return;
      }
      retried = true;
      retryTimer = setTimeout(() => {
        retryCleanup = subscribeToNote(userId, setNote, () => setUnavailable(true));
      }, 4000);
    });
    return () => {
      unsub();
      if (retryTimer) clearTimeout(retryTimer);
      retryCleanup?.();
    };
  }, [userId]);

  // A successful snapshot clears the unavailable state.
  useEffect(() => {
    if (note) setUnavailable(false);
  }, [note]);

  // Keep the countdown fresh.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Fire exactly at expiry so the banner is removed on time.
  useEffect(() => {
    if (!note) return;
    const msLeft = note.expiresAt - Date.now();
    if (msLeft <= 0) {
      setNow(Date.now());
      return;
    }
    const timeout = setTimeout(() => setNow(Date.now()), Math.min(msLeft + 50, 24 * 60 * 60 * 1000));
    return () => clearTimeout(timeout);
  }, [note]);

  const visible = note && isNoteActive(note, now) ? note : null;

  return (
    <AnimatePresence initial={false}>
      {unavailable && !visible && (
        <motion.div
          key="note-unavailable"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden flex-shrink-0 border-b border-[var(--border-primary)] bg-[var(--danger)]/10 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 px-3 sm:px-4 md:px-5 py-2">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--danger)]/15 flex items-center justify-center text-[var(--danger)] flex-shrink-0">
              <HiOutlineSparkles className="w-4 h-4" />
            </div>
            <p className="text-[12px] text-[var(--danger)]">Note unavailable. Update the deployed Firestore rules so notes are readable, then re-deploy.</p>
          </div>
        </motion.div>
      )}
      {visible && (
        <motion.div
          key="note-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden flex-shrink-0 border-b border-[var(--border-primary)] bg-[var(--accent-glow)]/30 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 px-3 sm:px-4 md:px-5 py-2">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-primary)]/15 flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0">
              <HiOutlineSparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{visible.text}</p>
              <p className="text-[11px] text-[var(--text-muted)]">expires in {formatExpiresIn(visible.expiresAt, now)}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
