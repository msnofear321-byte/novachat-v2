import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlinePlay, HiOutlinePause, HiOutlineMusicalNote, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { useNavigate } from 'react-router';
import { createConversation } from '@/services/firestore';
import type { MusicNote } from '@/services/musicNotes';

interface MusicNotePlayerProps {
  note: MusicNote | null;
  onClose: () => void;
}

export default function MusicNotePlayer({ note, onClose }: MusicNotePlayerProps) {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!note) {
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = note.audioURL;
      audioRef.current.load();
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
    setCurrentTime(0);
    setDuration(0);
  }, [note]);

  useEffect(() => {
    if (!note || !audioRef.current) return;
    if (playing) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [playing, note]);

  function handleTimeUpdate() {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  }

  function handleLoadedMetadata() {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }

  function handleEnded() {
    setPlaying(false);
    setCurrentTime(0);
  }

  function handleChat() {
    if (!note) return;
    createConversation(note.userId).then((convId) => {
      navigate(`/?c=${convId}`);
      onClose();
    }).catch(() => {});
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {note && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-[380px] glass-premium rounded-[28px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cover art */}
            <div className="relative h-52 bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-gradient-end)]/30 flex items-center justify-center">
              {note.coverURL ? (
                <img src={note.coverURL} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[var(--bg-input)] flex items-center justify-center">
                  <HiOutlineMusicalNote className="w-12 h-12 text-[var(--accent-primary)]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-all">
                <HiOutlineXMark className="w-4 h-4" />
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-[18px] font-bold drop-shadow-lg truncate">🎵 {note.songName}</p>
                <p className="text-white/70 text-[13px] mt-0.5 drop-shadow">{note.artist}</p>
              </div>
            </div>

            {/* User info */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-gradient-end)]/20 flex items-center justify-center overflow-hidden shrink-0">
                {note.userPhoto ? (
                  <img src={note.userPhoto} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-[12px] font-bold text-[var(--accent-primary)]">
                    {note.userName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{note.userName}</p>
                <p className="text-[11px] text-[var(--text-muted)]">listening to {note.songName}</p>
              </div>
              <button onClick={handleChat}
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-all">
                <HiOutlineChatBubbleLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* Player controls */}
            <div className="px-5 pb-5 pt-3 space-y-3">
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[var(--text-muted)] w-8 text-right tabular-nums">{formatTime(currentTime)}</span>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--accent-primary) ${progress}%, var(--border-primary) ${progress}%)`,
                      outline: 'none',
                    }}
                  />
                </div>
                <span className="text-[11px] text-[var(--text-muted)] w-8 tabular-nums">{formatTime(duration)}</span>
              </div>

              {/* Play/Pause */}
              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPlaying((p) => !p)}
                  className="w-14 h-14 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white flex items-center justify-center shadow-[0_4px_20px_var(--accent-glow)]"
                >
                  {playing ? <HiOutlinePause className="w-6 h-6" /> : <HiOutlinePlay className="w-6 h-6 ml-0.5" />}
                </motion.button>
              </div>
            </div>
          </motion.div>

          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
