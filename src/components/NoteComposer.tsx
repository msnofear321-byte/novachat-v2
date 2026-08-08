import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlineSparkles } from 'react-icons/hi2';
import { setMyNote, NOTE_MAX_LENGTH } from '@/services/tempNotes';

const SUGGESTIONS = ['Listening to music 🎵', 'Busy right now', 'Available for chat', 'Good night ❤️'];

interface NoteComposerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill with the user's current note when editing. */
  initialText?: string;
  onSaved?: () => void;
}

export default function NoteComposer({ isOpen, onClose, initialText = '', onSaved }: NoteComposerProps) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setError(null);
    }
  }, [isOpen, initialText]);

  function handleClose() {
    if (saving) return;
    setError(null);
    onClose();
  }

  async function handleSave() {
    const clean = text.trim();
    if (!clean) {
      setError('Note cannot be empty');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setMyNote(clean);
      handleClose();
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your note.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="w-full sm:max-w-[420px] glass-premium rounded-t-[24px] sm:rounded-[24px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
              <h3 className="font-semibold text-[var(--text-primary)] text-[15px]">Set a Note</h3>
              <button type="button" onClick={handleClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-all">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center flex-shrink-0">
                  <HiOutlineSparkles className="w-[18px] h-[18px] text-white" />
                </div>
                <p className="text-[12px] text-[var(--text-muted)]">Your note is visible for 24 hours, then disappears.</p>
              </div>

              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
                }}
                placeholder="Share a short note... (e.g. &quot;Available for chat&quot;)"
                maxLength={NOTE_MAX_LENGTH}
                rows={3}
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-primary)] text-[14px] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] resize-none custom-scrollbar"
              />
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setText(s)}
                      className={`px-2.5 py-1 rounded-full text-[12px] transition-all ${text === s ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <span className={`text-[11px] flex-shrink-0 ${text.length >= NOTE_MAX_LENGTH ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
                  {text.length}/{NOTE_MAX_LENGTH}
                </span>
              </div>

              {error && (
                <div className="px-3 py-2 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-[10px]">
                  <p className="text-[var(--danger)] text-[12px]">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-[var(--accent-primary)] text-white rounded-[14px] font-medium text-[14px] hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : 'Set Note'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
