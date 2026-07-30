import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlusCircle, HiOutlinePaperAirplane } from 'react-icons/hi2';
import { BsEmojiSmile } from 'react-icons/bs';
import EmojiPicker from '@/components/EmojiPicker';
import VoiceRecorder from '@/components/VoiceRecorder';

interface MessageInputProps {
  onSend: (text: string) => void | Promise<void>;
  onFileSelect: (file: File) => void | Promise<void>;
  onTyping: (active: boolean) => void;
  onVoiceRecorded: (blob: Blob, duration: number) => void | Promise<void>;
  uploadProgress?: number | null;
  replyingTo?: boolean;
  hideMediaControls?: boolean;
}

export default function MessageInput({ onSend, onFileSelect, onTyping, onVoiceRecorded, uploadProgress, replyingTo, hideMediaControls }: MessageInputProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const acceptRef = useRef('*/*');

  useEffect(() => {
    if (!replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  function handleTextChange(val: string) {
    setText(val);
    onTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    onTyping(false);
    clearTimeout(typingTimeoutRef.current);
    inputRef.current?.focus();
    await onSend(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleEmojiSelect(emoji: string) {
    setText((t) => t + emoji);
    inputRef.current?.focus();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { onFileSelect(file); setShowAttach(false); }
    e.target.value = '';
  }

  function openFilePicker(accept: string) {
    acceptRef.current = accept;
    if (fileRef.current) {
      fileRef.current.setAttribute('accept', accept);
      fileRef.current.value = '';
    }
    fileRef.current?.click();
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
      </AnimatePresence>

      <div className="sticky bottom-0 z-20 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-[var(--border-primary)] bg-[var(--bg-card)]/90 backdrop-blur-xl safe-input-area safe-area-bottom">
        {uploadProgress !== null && uploadProgress !== undefined && (
          <div className="mb-3 px-1">
            <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }}
                className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full" />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Uploading... {Math.round(uploadProgress)}%</p>
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2">
          {!hideMediaControls && (
            <div className="relative">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAttach(!showAttach)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[12px] flex items-center justify-center transition-all ${
                  showAttach ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
                }`}>
                <HiOutlinePlusCircle className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px]" />
              </motion.button>
              <AnimatePresence>
                {showAttach && (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-10" onClick={() => setShowAttach(false)} />
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 8 }}
                      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute bottom-12 left-0 glass-premium rounded-[16px] p-1.5 shadow-[var(--shadow-xl)] z-20 w-[160px]">
                      {[
                        { label: 'Image', icon: '🖼️', accept: 'image/*' },
                        { label: 'Video', icon: '🎬', accept: 'video/*' },
                        { label: 'Audio', icon: '🎵', accept: 'audio/*' },
                        { label: 'Document', icon: '📄', accept: 'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv' },
                      ].map(({ label, icon, accept }) => (
                        <button key={label} onClick={() => openFilePicker(accept)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--hover-bg)] transition-all">
                          <span className="text-[16px]">{icon}</span> {label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowEmoji(!showEmoji)}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[12px] flex items-center justify-center transition-all ${showEmoji ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'}`}>
            <BsEmojiSmile className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" />
          </motion.button>

          <div className="flex-1 relative">
            <input ref={inputRef} type="text" value={text} onChange={(e) => handleTextChange(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Type a message..." disabled={isRecording}
              autoComplete="off"
              autoCapitalize="sentences"
              autoCorrect="on"
              enterKeyHint="send"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] sm:rounded-[14px] text-[var(--text-primary)] text-[14px] sm:text-[14.5px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/30 transition-all duration-200 disabled:opacity-50" />
          </div>

          <AnimatePresence mode="wait">
            {text.trim() ? (
              <motion.button key="send" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.85 }} onClick={handleSend}
                className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] hover:from-[var(--accent-secondary)] hover:to-[var(--accent-primary)] text-white rounded-[12px] sm:rounded-[14px] flex items-center justify-center shadow-[var(--accent-shadow)] transition-all">
                <HiOutlinePaperAirplane className="w-[18px] h-[18px] sm:w-5 sm:h-5 rotate-[-25deg] translate-x-[-1px]" />
              </motion.button>
            ) : !hideMediaControls ? (
              <motion.div key="voice" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}>
                <VoiceRecorder onRecorded={(blob, duration) => { onVoiceRecorded(blob, duration); setIsRecording(false); }} onStart={() => setIsRecording(true)} onStop={() => setIsRecording(false)} isRecording={isRecording} />
              </motion.div>
            ) : (
              <motion.button key="send-placeholder" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }} disabled
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] sm:rounded-[14px] flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-input)]">
                <HiOutlinePaperAirplane className="w-[18px] h-[18px] sm:w-5 sm:h-5 rotate-[-25deg] translate-x-[-1px]" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
