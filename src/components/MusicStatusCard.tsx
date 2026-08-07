import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineMusicalNote, HiOutlinePlay, HiOutlineLink } from 'react-icons/hi2';
import { saveMusicStatus, getMusicStatus } from '@/services/music';
import type { MusicStatus } from '@/types';

interface MusicStatusCardProps {
  userId: string;
  isOwnProfile?: boolean;
}

const SERVICES = [
  { id: 'Spotify', label: 'Spotify', color: '#1DB954', emoji: '🎵' },
  { id: 'YouTube', label: 'YouTube', color: '#FF0000', emoji: '▶️' },
  { id: 'Apple Music', label: 'Apple Music', color: '#FC3C44', emoji: '🎶' },
  { id: 'Other', label: 'Other', color: 'var(--accent-primary)', emoji: '🎧' },
] as const;

export default function MusicStatusCard({ userId, isOwnProfile = false }: MusicStatusCardProps) {
  const [status, setStatus] = useState<MusicStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const [editService, setEditService] = useState<string>('Spotify');
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getMusicStatus(userId);
        setStatus(s);
      } catch {}
    };
    load();
  }, [userId]);

  const serviceInfo = (id: string) => SERVICES.find(s => s.id === id) || SERVICES[3];

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const s: MusicStatus = {
        userId,
        service: editService as any,
        trackTitle: editTitle.trim(),
        artist: editArtist.trim() || undefined,
        link: editLink.trim() || '',
        statusText: editText.trim() || undefined,
        updatedAt: Date.now(),
      };
      await saveMusicStatus(s);
      setStatus(s);
      setEditing(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    if (status) {
      setEditService(status.service || 'Spotify');
      setEditTitle(status.trackTitle || '');
      setEditArtist(status.artist || '');
      setEditLink(status.link || '');
      setEditText(status.statusText || '');
    }
    setEditing(true);
  };

  if (!status && !editing) {
    if (!isOwnProfile) return null;
    return (
      <div className="premium-card p-4">
        <button
          onClick={handleEdit}
          className="w-full flex items-center gap-3 p-3 rounded-[14px] text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-colors"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--hover-bg)' }}>
            <HiOutlineMusicalNote className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <span className="text-[14px]">Set your music status</span>
        </button>

        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-3 overflow-hidden"
            >
              <div className="flex gap-2">
                {SERVICES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setEditService(s.id)}
                    className={`flex-1 py-2 rounded-[10px] text-[12px] font-medium border transition-all ${
                      editService === s.id
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                        : 'border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Track title *"
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
              />
              <input
                type="text"
                value={editArtist}
                onChange={(e) => setEditArtist(e.target.value)}
                placeholder="Artist (optional)"
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
              />
              <input
                type="url"
                value={editLink}
                onChange={(e) => setEditLink(e.target.value)}
                placeholder="Link (optional)"
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-[12px] text-[14px] font-medium border border-[var(--border-primary)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editTitle.trim() || saving}
                  className="flex-1 py-2.5 rounded-[12px] text-[14px] font-medium text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-gradient-end))' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const svc = serviceInfo(status?.service || 'spotify');
  const svcColor = typeof svc.color === 'string' && svc.color.startsWith('#') ? svc.color : undefined;

  return (
    <div className="premium-card p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0"
          style={{ background: svcColor ? `${svcColor}20` : 'var(--hover-bg)' }}
        >
          <HiOutlineMusicalNote className="w-6 h-6" style={{ color: svc.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ backgroundColor: svcColor ? `${svcColor}20` : 'var(--hover-bg)', color: svc.color as string }}
            >
              {svc.label}
            </span>
          </div>
          <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate mt-1">{status?.trackTitle}</p>
          {status?.artist && (
            <p className="text-[13px] text-[var(--text-secondary)] truncate">{status.artist}</p>
          )}
          {status?.statusText && (
            <p className="text-[12px] text-[var(--text-muted)] italic mt-0.5 truncate">"{status.statusText}"</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {status?.link && (
            <a
              href={status.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-[var(--hover-bg)] transition-colors"
            >
              <HiOutlineLink className="w-4 h-4 text-[var(--text-muted)]" />
            </a>
          )}
          {isOwnProfile && (
            <button
              onClick={handleEdit}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-[var(--hover-bg)] transition-colors"
            >
              <HiOutlinePlay className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-[var(--border-primary)] space-y-3 overflow-hidden"
          >
            <div className="flex gap-2">
              {SERVICES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setEditService(s.id)}
                  className={`flex-1 py-2 rounded-[10px] text-[12px] font-medium border transition-all ${
                    editService === s.id
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  {s.emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Track title *"
              className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
            />
            <input
              type="text"
              value={editArtist}
              onChange={(e) => setEditArtist(e.target.value)}
              placeholder="Artist (optional)"
              className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
            />
            <input
              type="url"
              value={editLink}
              onChange={(e) => setEditLink(e.target.value)}
              placeholder="Link (optional)"
              className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-[12px] text-[14px] font-medium border border-[var(--border-primary)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!editTitle.trim() || saving}
                className="flex-1 py-2.5 rounded-[12px] text-[14px] font-medium text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-gradient-end))' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
