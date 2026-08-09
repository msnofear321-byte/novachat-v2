import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineXMark, HiOutlineMusicalNote, HiOutlineCloudArrowUp,
  HiOutlinePlay, HiOutlinePause, HiOutlinePhoto,
} from 'react-icons/hi2';
import { uploadToCloudinary } from '@/services/cloudinary';
import { useAuth } from '@/context/AuthContext';
import { getDisplayName } from '@/utils/userDisplay';
import { upsertMusicNote } from '@/services/musicNotes';

interface MusicNoteUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MusicNoteUpload({ isOpen, onClose }: MusicNoteUploadProps) {
  const { user } = useAuth();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [songName, setSongName] = useState('');
  const [artist, setArtist] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  function handleAudioSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('audio/')) {
      setError('Please select an audio file');
      return;
    }
    if (f.size > 30 * 1024 * 1024) {
      setError('File too large. Maximum 30MB allowed.');
      return;
    }
    setError(null);
    setAudioFile(f);
    const url = URL.createObjectURL(f);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview(url);
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
    }
    if (!songName) {
      const name = f.name.replace(/\.(mp3|wav|ogg|m4a|aac|flac)$/i, '');
      setSongName(name);
    }
  }

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file for cover');
      return;
    }
    setError(null);
    setCoverFile(f);
    const url = URL.createObjectURL(f);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(url);
  }

  function handlePlayPause() {
    if (!audioRef.current || !audioPreview) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  async function handleSave() {
    if (!audioFile || !songName.trim() || !user) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const audioResult = await uploadToCloudinary(audioFile, (p) => setProgress(p));
      const audioURL = audioResult.secure_url;

      let coverURL = '';
      if (coverFile) {
        const coverResult = await uploadToCloudinary(coverFile);
        coverURL = coverResult.secure_url;
      }

      await upsertMusicNote({
        userId: user.uid,
        userName: getDisplayName({ displayName: user.displayName, email: user.email, phone: user.phoneNumber }),
        userPhoto: user.photoURL || '',
        songName: songName.trim(),
        artist: artist.trim() || 'Unknown Artist',
        audioURL,
        coverURL,
        updatedAt: Date.now(),
      });

      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleRemovePreview() {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioFile(null);
    setAudioPreview(null);
    setSongName('');
    setArtist('');
    setPlaying(false);
  }

  function handleClose() {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setAudioFile(null);
    setAudioPreview(null);
    setCoverFile(null);
    setCoverPreview(null);
    setSongName('');
    setArtist('');
    setProgress(0);
    setError(null);
    setPlaying(false);
    onClose();
  }

  const canSave = audioFile && songName.trim() && !uploading;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            className="w-full max-w-[420px] glass-premium rounded-[24px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
              <h3 className="font-semibold text-[var(--text-primary)]">Add Music</h3>
              <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!audioPreview ? (
                <button onClick={() => audioInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-3 py-10 bg-[var(--bg-input)] border border-dashed border-[var(--border-primary)] rounded-[16px] hover:border-[var(--accent-primary)]/30 active:scale-[0.98] transition-all">
                  <HiOutlineCloudArrowUp className="w-10 h-10 text-[var(--accent-primary)]" />
                  <span className="text-[14px] font-medium text-[var(--text-secondary)]">Upload MP3</span>
                  <span className="text-[11px] text-[var(--text-muted)]">MP3, WAV, OGG, M4A (max 30MB)</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[16px]">
                    <div
                      className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-gradient-end)]/20 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer relative group"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {coverPreview ? (
                        <img src={coverPreview} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <HiOutlineMusicalNote className="w-7 h-7 text-[var(--accent-primary)]" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <HiOutlinePhoto className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <button onClick={handlePlayPause}
                        className="w-9 h-9 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center hover:opacity-90 transition-all">
                        {playing ? <HiOutlinePause className="w-4 h-4" /> : <HiOutlinePlay className="w-4 h-4 ml-0.5" />}
                      </button>
                    </div>

                    <button onClick={handleRemovePreview}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
                      <HiOutlineXMark className="w-4 h-4" />
                    </button>
                  </div>

                  <input ref={audioInputRef} type="file" accept="audio/*"
                    className="hidden" onChange={handleAudioSelect} />
                  <input ref={coverInputRef} type="file" accept="image/*"
                    className="hidden" onChange={handleCoverSelect} />

                  <div className="space-y-3">
                    <input type="text" value={songName} onChange={(e) => setSongName(e.target.value)}
                      placeholder="Song name *" maxLength={100}
                      className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[var(--text-primary)] text-[13px] placeholder-[var(--text-muted)] focus:outline-none" />
                    <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)}
                      placeholder="Artist name" maxLength={100}
                      className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[var(--text-primary)] text-[13px] placeholder-[var(--text-muted)] focus:outline-none" />
                  </div>

                  {error && (
                    <div className="px-3 py-2 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-[10px]">
                      <p className="text-[var(--danger)] text-[12px]">{error}</p>
                    </div>
                  )}

                  {uploading && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)]/70 rounded-full" />
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] text-right">{Math.round(progress)}%</p>
                    </div>
                  )}

                  <button onClick={handleSave} disabled={!canSave}
                    className="w-full py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white rounded-[14px] font-medium text-[14px] disabled:opacity-50 hover:opacity-90 transition-all">
                    {uploading ? 'Uploading...' : 'Add Music Note'}
                  </button>
                </div>
              )}

              {!audioPreview && (
                <>
                  <input ref={audioInputRef} type="file" accept="audio/*"
                    className="hidden" onChange={handleAudioSelect} />
                  <button onClick={handleClose}
                    className="w-full py-3 border border-[var(--border-primary)] text-[var(--text-muted)] rounded-[14px] font-medium text-[14px] hover:bg-[var(--hover-bg)] transition-all">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      <audio ref={audioRef} onEnded={() => setPlaying(false)} />
    </AnimatePresence>
  );
}
