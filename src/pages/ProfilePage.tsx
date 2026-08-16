import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineCamera, HiOutlineCheck, HiOutlineUser, HiOutlineShieldCheck,
  HiOutlineGlobeAlt, HiOutlineClock, HiOutlineTrash, HiOutlinePhone, HiOutlineEnvelope,
} from 'react-icons/hi2';
import { FaInstagram } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile } from '@/services/firestore';
import { uploadToCloudinary } from '@/services/cloudinary';
import { isOnlineNow, PRESENCE_TICK_MS } from '@/services/presence';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import UserAvatar from '@/components/UserAvatar';
import MusicStatusCard from '@/components/MusicStatusCard';
import { getDisplayName } from '@/utils/userDisplay';
import { sanitizeInstagram, isValidInstagramHandle, instagramUrl } from '@/utils/instagram';
import type { User } from '@/types';

export default function ProfilePage() {
  const { user, userProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || '');
  const [about, setAbout] = useState(userProfile?.about || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [instagram, setInstagram] = useState(userProfile?.instagram || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || user?.photoURL || '');
  const [now, setNow] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const instagramInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), PRESENCE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as User;
        setDisplayName(data.displayName || user?.displayName || '');
        setAbout(data.about || '');
        setPhone(data.phone || '');
        setInstagram(data.instagram || '');
        if (data.photoURL !== undefined) setPhotoURL(data.photoURL);
      }
    });
    return unsub;
  }, [user, user?.uid]);

  async function handleSave() {
    if (!user || !displayName.trim()) return;
    const ig = sanitizeInstagram(instagram);
    setInstagram(ig);
    setSaving(true);
    try {
      const data: Record<string, unknown> = { displayName: displayName.trim(), instagram: ig };
      if (about !== undefined) data.about = about.trim();
      if (phone !== undefined) data.phone = phone.trim();
      await updateUserProfile(user.uid, data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      await updateUserProfile(user.uid, { photoURL: result.secure_url });
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  }

  async function handleRemovePhoto() {
    if (!user) return;
    await updateUserProfile(user.uid, { photoURL: '' });
    setPhotoURL('');
  }

  const isOnline = isOnlineNow(userProfile, now);

  const profileDisplayName = getDisplayName({
    displayName: displayName.trim() || user?.displayName || undefined,
    username: userProfile?.username,
    phone: userProfile?.phone || undefined,
    email: userProfile?.email || user?.email,
  });

  const igHandle = sanitizeInstagram(instagram);
  const igUrl = instagramUrl(igHandle);
  const igInvalid = igHandle.length > 0 && !isValidInstagramHandle(igHandle);

  const fieldInput =
    'input-premium w-full px-4 py-3';

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="max-w-[600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-[calc(env(safe-area-inset-bottom)+32px)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">Profile</h1>
        </div>

        {/* Hero: avatar + identity */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[min(360px,90vw)] h-[220px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, var(--accent-glow-strong) 0%, transparent 70%)', filter: 'blur(42px)' }}
          />
          <div className="relative flex flex-col items-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative group mb-4"
            >
              <div className="p-[3px] rounded-full bg-gradient-to-br from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-gradient-end)] shadow-[var(--accent-shadow-lg)]">
                <UserAvatar photoURL={photoURL || undefined} displayName={profileDisplayName} size="xl" />
              </div>
              {isOnline && (
                <>
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[var(--success)] border-[3px] border-[var(--bg-primary)]" />
                  <span className="online-ring" />
                </>
              )}
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/35 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                {uploading ? (
                  <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <HiOutlineCamera className="w-8 h-8 text-white drop-shadow" />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center w-full"
            >
              <h2 className="text-[24px] sm:text-[28px] font-bold text-[var(--text-primary)] leading-tight truncate max-w-full px-2">
                {profileDisplayName}
              </h2>
              {(userProfile?.username || phone) && (
                <p className="text-[13px] font-medium text-[var(--accent-secondary)] mt-1">
                  {userProfile?.username ? `@${userProfile.username}` : phone}
                </p>
              )}
              {about && (
                <p className="text-[var(--text-secondary)] text-[13.5px] text-center mt-2.5 max-w-[340px] leading-relaxed">
                  {about}
                </p>
              )}
              <p className="text-[var(--text-muted)] text-[12px] mt-3">Tap photo to change</p>
              {photoURL && (
                <button onClick={handleRemovePhoto}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-[10px] transition-all">
                  <HiOutlineTrash className="w-3.5 h-3.5" />
                  Remove Photo
                </button>
              )}
            </motion.div>
          </div>
        </div>

        {/* Instagram card — only shown once an Instagram handle is set */}
        {igUrl && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="premium-card premium-card-hover p-4 mb-6 flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#E1306C] via-[#C13584] to-[#833AB4] text-white shadow-[0_4px_18px_rgba(225,48,108,0.35)]">
            <FaInstagram className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--text-primary)] text-[15px]">Instagram</p>
            <a href={igUrl} target="_blank" rel="noopener noreferrer"
              className="text-[var(--accent-secondary)] text-[14px] font-medium truncate block hover:underline">
              @{igHandle}
            </a>
          </div>
        </motion.div>
        )}

        {/* Profile info card */}
        <div className="premium-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineUser className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="section-label mb-0">Personal Info</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] mb-1.5 ml-1">
                Display Name
              </label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={fieldInput} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] mb-1.5 ml-1">
                About
              </label>
              <input type="text" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Hey there! I am using NovaChat."
                className={`${fieldInput} placeholder-[var(--text-muted)]`} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] mb-1.5 ml-1">
                <HiOutlinePhone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Phone
              </label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890"
                className={`${fieldInput} placeholder-[var(--text-muted)]`} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] mb-1.5 ml-1">
                <FaInstagram className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                Instagram / @username
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[15px] font-medium">@</div>
                <input ref={instagramInputRef} type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)}
                  placeholder="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  className={`${fieldInput} pl-10 ${igInvalid ? 'input-error' : ''}`} />
              </div>
              {igInvalid && (
                <p className="text-[var(--warning)] text-[12px] mt-1.5 ml-1">
                  Letters, numbers, dots &amp; underscores only (max 30).
                </p>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] mb-1.5 ml-1">
                <HiOutlineEnvelope className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Email
              </label>
              <input type="email" value={user?.email || ''} disabled
                className={`${fieldInput} text-[var(--text-muted)] cursor-not-allowed opacity-60`} />
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="premium-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineShieldCheck className="w-4 h-4 text-[var(--accent-secondary)]" />
            <span className="section-label mb-0">Account</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <HiOutlineGlobeAlt className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-[14px] text-[var(--text-secondary)]">Status</span>
              </div>
              <span className={`text-[13px] font-medium ${isOnline ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="h-px bg-[var(--border-secondary)]" />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <HiOutlineClock className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-[14px] text-[var(--text-secondary)]">Member since</span>
              </div>
              <span className="text-[13px] text-[var(--text-muted)]">
                {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recently'}
              </span>
            </div>
          </div>
        </div>

        {/* Music Status */}
        {user && (
          <div className="mb-6">
            <MusicStatusCard userId={user.uid} isOwnProfile />
          </div>
        )}

        {/* Save button */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving || !displayName.trim()}
          className="btn-primary w-full">
          <AnimatePresence mode="wait">
            {saving ? (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : saved ? (
              <motion.div key="saved" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2">
                <HiOutlineCheck className="w-5 h-5" /> Saved!
              </motion.div>
            ) : (
              <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Save Changes
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
