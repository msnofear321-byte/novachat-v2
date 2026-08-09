import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlinePhoto, HiOutlineCheck } from 'react-icons/hi2';
import { uploadStory, type StoryPrivacy } from '@/services/status';
import { searchUsers } from '@/services/firestore';
import { getDisplayName } from '@/utils/userDisplay';
import { uploadToCloudinary, getMediaDownloadURL } from '@/services/cloudinary';
import UserAvatar from '@/components/UserAvatar';
import type { User } from '@/types';

interface StatusComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: () => void;
}

const PRIVACY_OPTIONS: { value: StoryPrivacy; label: string; hint: string }[] = [
  { value: 'everyone', label: 'Everyone', hint: 'All NovaChat users' },
  { value: 'contacts', label: 'Contacts', hint: 'People in your contacts' },
  { value: 'selected', label: 'Selected', hint: 'Only the people you choose' },
  { value: 'nobody', label: 'Nobody', hint: 'Only you' },
];

export default function StatusComposer({ isOpen, onClose, onUploaded }: StatusComposerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<StoryPrivacy>('everyone');
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum 50MB allowed.');
      return;
    }
    setError(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function handleSearchUsers(q: string) {
    setUserQuery(q);
    if (q.trim().length < 1) {
      setUserResults([]);
      return;
    }
    try {
      const users = await searchUsers(q);
      setUserResults(users);
    } catch {
      setUserResults([]);
    }
  }

  function toggleAllowedUser(uid: string) {
    setAllowedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, (p) => setProgress(p));
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const url = getMediaDownloadURL(result.secure_url, type === 'image' ? 'image' : 'video');
      await uploadStory(url, type, text.trim() || undefined, privacy, allowedUsers);
      handleClose();
      onUploaded?.();
    } catch (e) {
      let msg = 'Upload failed. Please try again.';
      if (e instanceof Error) {
        if (e.message.includes('permission') || e.message.includes('insufficient') || e.message.includes('PERMISSION_DENIED')) {
          msg = 'Permission denied. Please try logging out and logging back in, then try again.';
        } else if (e.message.includes('Not authenticated')) {
          msg = 'You are not logged in. Please log in and try again.';
        } else {
          msg = e.message;
        }
      }
      setError(msg);
      console.error('Story upload failed:', e);
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setPreview(null);
    setText('');
    setProgress(0);
    setError(null);
    setPrivacy('everyone');
    setAllowedUsers([]);
    setUserQuery('');
    setUserResults([]);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
            className="w-full max-w-[420px] glass-premium rounded-[24px] overflow-hidden max-h-[calc(100dvh-2rem)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
              <h3 className="font-semibold text-[var(--text-primary)]">New Status</h3>
              <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar">
              {!preview ? (
                <div className="flex gap-3">
                  <button type="button" onClick={() => { fileRef.current?.click(); }}
                    className="flex-1 flex flex-col items-center gap-3 py-8 bg-[var(--bg-input)] border border-dashed border-[var(--border-primary)] rounded-[16px] hover:border-[var(--accent-primary)]/30 active:scale-[0.98] transition-all">
                    <HiOutlinePhoto className="w-8 h-8 text-[var(--accent-primary)]" />
                    <span className="text-[13px] text-[var(--text-secondary)]">Photo / Video</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*,video/*"
                    style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}
                    onChange={handleFileSelect} />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-[16px] overflow-hidden bg-black">
                    {file?.type.startsWith('video/') ? (
                      <video src={preview} className="w-full max-h-[300px] object-contain" controls />
                    ) : (
                      <img src={preview} className="w-full max-h-[300px] object-contain" alt="" />
                    )}
                    <button type="button" onClick={() => { setFile(null); setPreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white">
                      <HiOutlineXMark className="w-4 h-4" />
                    </button>
                  </div>
                  <input type="text" value={text} onChange={(e) => setText(e.target.value)}
                    placeholder="Add a caption..." maxLength={100}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[var(--text-primary)] text-[13px] placeholder-[var(--text-muted)] focus:outline-none" />

                  {/* Privacy picker */}
                  <div>
                    <p className="text-[12px] text-[var(--text-muted)] mb-1.5">Who can see this status</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRIVACY_OPTIONS.map((opt) => (
                        <button key={opt.value} type="button"
                          onClick={() => setPrivacy(opt.value)}
                          className={`px-3 py-2 rounded-[10px] border text-left transition-all ${
                            privacy === opt.value
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-glow)]'
                              : 'border-[var(--border-primary)] bg-[var(--bg-input)] hover:border-[var(--accent-primary)]/30'
                          }`}>
                          <p className={`text-[12px] font-medium ${privacy === opt.value ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>{opt.label}</p>
                          <p className="text-[10px] text-[var(--text-muted)] leading-snug">{opt.hint}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected users multi-select */}
                  {privacy === 'selected' && (
                    <div className="rounded-[12px] border border-[var(--border-primary)] bg-[var(--bg-input)] p-3 space-y-2">
                      <p className="text-[12px] text-[var(--text-muted)]">
                        {allowedUsers.length > 0
                          ? `${allowedUsers.length} selected`
                          : 'Search and select people'}
                      </p>
                      <input type="text" value={userQuery} onChange={(e) => handleSearchUsers(e.target.value)}
                        placeholder="Search people..."
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[10px] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none" />
                      {userResults.length > 0 && (
                        <div className="max-h-[140px] overflow-y-auto custom-scrollbar divide-y divide-[var(--border-primary)]">
                          {userResults.map((u) => (
                            <button key={u.uid} type="button" onClick={() => toggleAllowedUser(u.uid)}
                              className="w-full flex items-center gap-2.5 py-2 text-left">
                              <UserAvatar photoURL={u.photoURL} displayName={getDisplayName(u)} size="sm" />
                              <span className="flex-1 min-w-0">
                                <p className="text-[13px] text-[var(--text-primary)] truncate">{getDisplayName(u)}</p>
                              </span>
                              <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                                allowedUsers.includes(u.uid) ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-primary)]'
                              }`}>
                                {allowedUsers.includes(u.uid) && <HiOutlineCheck className="w-3.5 h-3.5 text-white" />}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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
                          className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)]/70 rounded-full relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite]" />
                        </motion.div>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] text-right">{Math.round(progress)}%</p>
                    </div>
                  )}

                  <button type="button" onClick={handleUpload} disabled={uploading || (privacy === 'selected' && allowedUsers.length === 0)}
                    className="w-full py-3 bg-[var(--accent-primary)] text-white rounded-[14px] font-medium text-[14px] hover:opacity-90 disabled:opacity-50 transition-all">
                    {uploading ? 'Uploading' : 'Share Status'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
