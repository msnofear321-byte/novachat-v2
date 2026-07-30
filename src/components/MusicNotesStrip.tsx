import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineMusicalNote } from 'react-icons/hi2';
import { subscribeMusicNotes, type MusicNote } from '@/services/musicNotes';
import { useAuth } from '@/context/AuthContext';
import MusicNoteUpload from './MusicNoteUpload';
import MusicNotePlayer from './MusicNotePlayer';

export default function MusicNotesStrip() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<MusicNote[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [playingNote, setPlayingNote] = useState<MusicNote | null>(null);
  useEffect(() => {
    const unsub = subscribeMusicNotes(setNotes);
    return unsub;
  }, []);

  const myNote = notes.find((n) => n.userId === user?.uid);
  const otherNotes = notes.filter((n) => n.userId !== user?.uid);

  if (notes.length === 0 && !myNote) return null;

  return (
    <>
      <div className="relative px-4 pt-3 pb-2">
        <div
          className="flex gap-4 overflow-x-auto scrollbar-none py-2 px-1 -mx-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Current user */}
          <div className="flex flex-col items-center gap-1 shrink-0 w-[72px]">
            <button
              onClick={() => setShowUpload(true)}
              className="relative group"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-gradient-end)]/20 border-2 border-[var(--border-primary)] flex items-center justify-center overflow-hidden hover:border-[var(--accent-primary)]/50 transition-all duration-200">
                {myNote && myNote.coverURL ? (
                  <img src={myNote.coverURL} className="w-full h-full object-cover" alt="" />
                ) : myNote ? (
                  <HiOutlineMusicalNote className="w-6 h-6 text-[var(--accent-primary)]" />
                ) : (
                  <HiOutlinePlus className="w-6 h-6 text-[var(--accent-primary)]" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[var(--accent-primary)] border-2 border-[var(--bg-primary)] flex items-center justify-center">
                {myNote ? (
                  <span className="text-[9px] text-white font-bold leading-none">♪</span>
                ) : (
                  <HiOutlinePlus className="w-2.5 h-2.5 text-white" />
                )}
              </div>
            </button>

            {/* Song name above avatar */}
            {myNote ? (
              <div className="flex flex-col items-center min-w-0 max-w-[72px]">
                <p className="text-[9px] text-[var(--accent-primary)] font-semibold truncate w-full text-center leading-tight">
                  🎵 {myNote.songName}
                </p>
                <p className="text-[8px] text-[var(--text-muted)] truncate w-full text-center leading-tight mt-0.5">
                  {myNote.artist}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center min-w-0 max-w-[72px]">
                <p className="text-[9px] text-[var(--accent-primary)] font-semibold truncate w-full text-center">
                  + Add Music
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          {otherNotes.length > 0 && (
            <div className="w-px h-14 bg-[var(--border-primary)] self-center shrink-0" />
          )}

          {/* Other users */}
          {otherNotes.map((note) => (
            <motion.button
              key={note.userId}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPlayingNote(note)}
              className="flex flex-col items-center gap-1 shrink-0 w-[72px] group"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-[var(--border-primary)] overflow-hidden hover:border-[var(--accent-primary)]/50 transition-all duration-200">
                  {note.coverURL ? (
                    <img src={note.coverURL} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-gradient-end)]/20 flex items-center justify-center">
                      <HiOutlineMusicalNote className="w-5 h-5 text-[var(--accent-primary)]" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center min-w-0 max-w-[72px]">
                <p className="text-[9px] text-[var(--text-primary)] font-semibold truncate w-full text-center leading-tight">
                  🎵 {note.songName}
                </p>
                <p className="text-[8px] text-[var(--text-muted)] truncate w-full text-center leading-tight mt-0.5">
                  {note.artist}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Gradient fade on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--bg-sidebar)] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--bg-sidebar)] to-transparent pointer-events-none" />
      </div>

      <MusicNoteUpload isOpen={showUpload} onClose={() => setShowUpload(false)} />
      <MusicNotePlayer note={playingNote} onClose={() => setPlayingNote(null)} />
    </>
  );
}
