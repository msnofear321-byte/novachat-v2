import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlinePhoto } from 'react-icons/hi2';
import { uploadStory } from '@/services/status';
import { uploadToCloudinary, getMediaDownloadURL } from '@/services/cloudinary';

interface StatusComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: () => void;
}

export default function StatusComposer({ isOpen, onClose, onUploaded }: StatusComposerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
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

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, (p) => setProgress(p));
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const url = getMediaDownloadURL(result.secure_url, type === 'image' ? 'image' : 'video');
      await uploadStory(url, type, text.trim() || undefined);
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
            className="w-full max-w-[420px] glass-premium rounded-[24px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
              <h3 className="font-semibold text-[var(--text-primary)]">New Status</h3>
              <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
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

                  <button type="button" onClick={handleUpload} disabled={uploading}
                    className="w-full py-3 bg-[var(--accent-primary)] text-white rounded-[14px] font-medium text-[14px] hover:opacity-90 disabled:opacity-50 transition-all">
                    {uploading ? 'Uploading...' : 'Share Status'}
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
