import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineCamera, HiOutlineCheck, HiOutlineUser, HiOutlineShieldCheck, HiOutlineGlobeAlt, HiOutlineClock, HiOutlineTrash } from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile } from '@/services/firestore';
import { uploadToCloudinary } from '@/services/cloudinary';
import { isOnlineNow, PRESENCE_TICK_MS } from '@/services/presence';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import UserAvatar from '@/components/UserAvatar';
import MusicStatusCard from '@/components/MusicStatusCard';
import { getDisplayName } from '@/utils/userDisplay';
import type { User } from '@/types';

export default function ProfilePage() {
  const { user, userProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || '');
  const [about, setAbout] = useState(userProfile?.about || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || user?.photoURL || '');
  const [now, setNow] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);

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
        if (data.photoURL !== undefined) setPhotoURL(data.photoURL);
      }
    });
    return unsub;
  }, [user, user?.uid]);

  async function handleSave() {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = { displayName: displayName.trim() };
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

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="max-w-[600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">Profile</h1>
        </div>

        {/* Avatar section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group mb-4">
            <div className="relative">
              <UserAvatar photoURL={photoURL || undefined} displayName={profileDisplayName} size="lg" />
              {isOnline && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--success)] border-[3px] border-[var(--bg-primary)]" />
              )}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/30 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <HiOutlineCamera className="w-7 h-7 text-white drop-shadow" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <h2 className="text-[22px] sm:text-[24px] font-bold text-[var(--text-primary)] mb-1 text-center truncate max-w-full px-2">
            {profileDisplayName}
          </h2>
          <p className="text-[var(--accent-primary)] text-[13px] font-medium">Tap photo to change</p>
          {photoURL && (
            <button onClick={handleRemovePhoto}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-[10px] transition-all">
              <HiOutlineTrash className="w-3.5 h-3.5" />
              Remove Photo
            </button>
          )}
        </div>

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
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-primary)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)]/40 transition-all" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] mb-1.5 ml-1">
                About
              </label>
              <input type="text" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Hey there! I am using NovaChat."
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-primary)] text-[15px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)]/40 transition-all" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] mb-1.5 ml-1">
                Phone
              </label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890"
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-primary)] text-[15px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)]/40 transition-all" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-[var(--text-secondary)] mb-1.5 ml-1 block">Email</label>
              <input type="email" value={user?.email || ''} disabled
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-muted)] text-[15px] cursor-not-allowed opacity-60" />
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
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
