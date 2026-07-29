import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineArrowLeft, HiOutlinePhoto, HiOutlineBell,
  HiOutlineInformationCircle, HiOutlineSwatch, HiOutlineCommandLine,
  HiOutlineCamera, HiOutlineCheck, HiOutlineArrowRightOnRectangle,
  HiOutlineTrash, HiOutlineUser, HiOutlinePhone, HiOutlineChatBubbleLeftRight,
  HiOutlineClock, HiOutlineEyeSlash,
  HiOutlineServerStack,
} from 'react-icons/hi2';
import { useTheme, THEMES, FONTS } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useWallpaper } from '@/context/WallpaperContext';
import { useNotifications } from '@/services/notifications';
import WallpaperPicker from '@/components/WallpaperPicker';
import UserAvatar from '@/components/UserAvatar';
import { updateUserProfile } from '@/services/firestore';
import { uploadToCloudinary } from '@/services/cloudinary';
import { logout } from '@/services/auth';
import { useState, useRef, useEffect } from 'react';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, font, setTheme, setFont } = useTheme();
  const { user, userProfile } = useAuth();
  const { wallpaper } = useWallpaper();
  const { permission, requestPermission } = useNotifications();
  const [wallpaperOpen, setWallpaperOpen] = useState(false);

  const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || '');
  const [about, setAbout] = useState(userProfile?.about || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [notifSound, setNotifSound] = useState(() => localStorage.getItem('novachat_notif_sound') !== 'off');
  const [showReadReceipts, setShowReadReceipts] = useState(() => localStorage.getItem('novachat_read_receipts') !== 'off');
  const [showLastSeen, setShowLastSeen] = useState(() => localStorage.getItem('novachat_last_seen') !== 'off');
  const [showTypingIndicators, setShowTypingIndicators] = useState(() => localStorage.getItem('novachat_typing') !== 'off');
  const [storageUsed, setStorageUsed] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => setStorageUsed(est.usage || 0));
    }
  }, []);

  const currentTheme = THEMES.find((t) => t.id === theme);
  const currentFont = FONTS.find((f) => f.id === font);

  function toggleNotifSound() {
    const next = !notifSound;
    setNotifSound(next);
    localStorage.setItem('novachat_notif_sound', next ? 'on' : 'off');
  }

  function toggleReadReceipts() {
    const next = !showReadReceipts;
    setShowReadReceipts(next);
    localStorage.setItem('novachat_read_receipts', next ? 'on' : 'off');
  }

  function toggleLastSeen() {
    const next = !showLastSeen;
    setShowLastSeen(next);
    localStorage.setItem('novachat_last_seen', next ? 'on' : 'off');
  }

  function toggleTypingIndicators() {
    const next = !showTypingIndicators;
    setShowTypingIndicators(next);
    localStorage.setItem('novachat_typing', next ? 'on' : 'off');
  }

  async function clearStorage() {
    try {
      if (navigator.storage?.persist) {
        await navigator.storage.persist();
      }
      localStorage.removeItem('novachat_wallpaper');
      localStorage.removeItem('novachat_notif_sound');
      localStorage.removeItem('novachat_read_receipts');
      localStorage.removeItem('novachat_last_seen');
      localStorage.removeItem('novachat_typing');
      window.location.reload();
    } catch {
      // silently fail
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async function handleSaveProfile() {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const data: Record<string, unknown> = { displayName: displayName.trim() };
      if (about !== undefined) data.about = about.trim();
      if (phone !== undefined) data.phone = phone.trim();
      await updateUserProfile(user.uid, data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save profile failed:', e);
      setSaveError('Failed to save. Please try again.');
      setTimeout(() => setSaveError(''), 3000);
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
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    try {
      const { deleteUser } = await import('firebase/auth');
      const { auth } = await import('@/services/firebase');
      if (auth.currentUser) {
        await updateUserProfile(auth.currentUser.uid, { displayName: 'Deleted User', photoURL: '', about: '' });
        await deleteUser(auth.currentUser);
      }
      navigate('/login', { replace: true });
    } catch {
      alert('Failed to delete account. You may need to re-login first.');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-[600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-all">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">Settings</h1>
        </div>

        {/* Profile Card */}
        <div className="premium-card p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <UserAvatar photoURL={user?.photoURL ?? undefined} displayName={user?.displayName || '?'} size="lg" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <HiOutlineCamera className="w-6 h-6 text-white" />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text-primary)] text-[16px] truncate">{userProfile?.displayName || user?.displayName || 'User'}</p>
              <p className="text-[var(--text-secondary)] text-[13px] truncate">{user?.email}</p>
              {userProfile?.about && (
                <p className="text-[var(--text-muted)] text-[12px] truncate mt-0.5">{userProfile.about}</p>
              )}
              {user?.photoURL && (
                <button onClick={handleRemovePhoto}
                  className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[var(--danger)] hover:underline transition-all">
                  <HiOutlineTrash className="w-3 h-3" />
                  Remove photo
                </button>
              )}
            </div>
            <button onClick={() => navigate('/profile')}
              className="px-3 py-1.5 text-[13px] font-medium text-[var(--accent-primary)] bg-[var(--accent-glow)] rounded-[10px] hover:bg-[var(--accent-primary)]/20 transition-all flex-shrink-0">
              Edit
            </button>
          </div>
        </div>

        {/* Profile Edit Section */}
        <div className="mb-6">
          <span className="section-label">Profile</span>
          <div className="space-y-3 mt-2">
            <div className="premium-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
                  <HiOutlineUser className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="text-[12px] text-[var(--text-muted)] mb-1 block">Display Name</label>
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-transparent text-[var(--text-primary)] text-[15px] font-medium focus:outline-none placeholder-[var(--text-muted)]" />
                </div>
              </div>
            </div>
            <div className="premium-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-secondary)]">
                  <HiOutlineChatBubbleLeftRight className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="text-[12px] text-[var(--text-muted)] mb-1 block">About</label>
                  <input type="text" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Hey there! I am using NovaChat."
                    className="w-full bg-transparent text-[var(--text-primary)] text-[15px] focus:outline-none placeholder-[var(--text-muted)]" />
                </div>
              </div>
            </div>
            <div className="premium-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-tertiary)]">
                  <HiOutlinePhone className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="text-[12px] text-[var(--text-muted)] mb-1 block">Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890"
                    className="w-full bg-transparent text-[var(--text-primary)] text-[15px] focus:outline-none placeholder-[var(--text-muted)]" />
                </div>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleSaveProfile} disabled={saving || !displayName.trim()}
              className="btn-primary w-full">
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <><HiOutlineCheck className="w-5 h-5" /> Saved!</>
              ) : (
                'Save Profile'
              )}
            </motion.button>
            {saveError && (
              <p className="text-[var(--danger)] text-[12px] text-center mt-2">{saveError}</p>
            )}
          </div>
        </div>

        {/* Theme Section */}
        <div className="mb-6">
          <span className="section-label">Appearance</span>
          <div className="mt-2">
            <div className="premium-card p-4 mb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
                  <HiOutlineSwatch className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] text-[15px]">Theme</p>
                  <p className="text-[var(--text-muted)] text-[12px]">{currentTheme?.label || 'Dark'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <motion.button key={t.id} whileTap={{ scale: 0.95 }} onClick={() => setTheme(t.id)}
                    className={`relative flex flex-col items-center gap-2 px-3 py-3 rounded-[12px] border-2 transition-all ${
                      theme === t.id
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                        : 'border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/30'
                    }`}>
                    <div className="flex gap-1">
                      {t.preview.map((color, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <span className={`text-[11px] font-medium ${theme === t.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>{t.label}</span>
                    {theme === t.id && (
                      <motion.div layoutId="theme-active" className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--accent-primary)] flex items-center justify-center" transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Font Picker */}
            <div className="premium-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-secondary)]">
                  <HiOutlineCommandLine className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] text-[15px]">Font Style</p>
                  <p className="text-[var(--text-muted)] text-[12px]">{currentFont?.label || 'Inter'}</p>
                </div>
              </div>
              <div className="space-y-2">
                {FONTS.map((f) => (
                  <motion.button key={f.id} whileTap={{ scale: 0.98 }} onClick={() => setFont(f.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] border transition-all text-left ${
                      font === f.id
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                        : 'border-transparent hover:bg-[var(--hover-bg)]'
                    }`}>
                    <p className="text-[18px] font-semibold" style={{ fontFamily: f.family }}>Aa</p>
                    <div className="flex-1">
                      <p className={`font-medium text-[13px] ${font === f.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`} style={{ fontFamily: f.family }}>{f.label}</p>
                    </div>
                    {font === f.id && (
                      <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications & Sound */}
        <div className="mb-6">
          <span className="section-label">Notifications</span>
          <div className="mt-2">
            <motion.button whileTap={{ scale: 0.98 }} onClick={toggleNotifSound}
              className="w-full premium-card p-4 hover:border-[var(--accent-primary)]/20 transition-all text-left">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${notifSound ? 'bg-[var(--success)]/15 text-[var(--success)]' : 'bg-[var(--hover-bg)] text-[var(--text-muted)]'}`}>
                  <HiOutlineBell className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)] text-[15px]">Message Sounds</p>
                  <p className="text-[var(--text-muted)] text-[12px]">Play sound for new messages</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-all ${notifSound ? 'bg-[var(--success)]' : 'bg-[var(--bg-input)] border border-[var(--border-primary)]'} flex items-center ${notifSound ? 'justify-end' : 'justify-start'} px-1`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow transition-all" />
                </div>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Privacy */}
        <div className="mb-6">
          <span className="section-label">Privacy</span>
          <div className="mt-2 space-y-2">
            <motion.button whileTap={{ scale: 0.98 }} onClick={toggleReadReceipts}
              className="w-full premium-card p-4 hover:border-[var(--accent-primary)]/20 transition-all text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--hover-bg)] flex items-center justify-center text-[var(--text-muted)]">
                  <HiOutlineEyeSlash className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)] text-[15px]">Read Receipts</p>
                  <p className="text-[var(--text-muted)] text-[12px]">{showReadReceipts ? 'Others can see when you read messages' : 'Read receipts are hidden'}</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-all ${showReadReceipts ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-input)] border border-[var(--border-primary)]'} flex items-center ${showReadReceipts ? 'justify-end' : 'justify-start'} px-1`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow transition-all" />
                </div>
              </div>
            </motion.button>

            <motion.button whileTap={{ scale: 0.98 }} onClick={toggleLastSeen}
              className="w-full premium-card p-4 hover:border-[var(--accent-primary)]/20 transition-all text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--hover-bg)] flex items-center justify-center text-[var(--text-muted)]">
                  <HiOutlineClock className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)] text-[15px]">Last Seen</p>
                  <p className="text-[var(--text-muted)] text-[12px]">{showLastSeen ? 'Others can see your last seen time' : 'Last seen is hidden'}</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-all ${showLastSeen ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-input)] border border-[var(--border-primary)]'} flex items-center ${showLastSeen ? 'justify-end' : 'justify-start'} px-1`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow transition-all" />
                </div>
              </div>
            </motion.button>

            <motion.button whileTap={{ scale: 0.98 }} onClick={toggleTypingIndicators}
              className="w-full premium-card p-4 hover:border-[var(--accent-primary)]/20 transition-all text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--hover-bg)] flex items-center justify-center text-[var(--text-muted)]">
                  <HiOutlineChatBubbleLeftRight className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)] text-[15px]">Typing Indicators</p>
                  <p className="text-[var(--text-muted)] text-[12px]">{showTypingIndicators ? 'Others see when you are typing' : 'Typing indicators are hidden'}</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-all ${showTypingIndicators ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-input)] border border-[var(--border-primary)]'} flex items-center ${showTypingIndicators ? 'justify-end' : 'justify-start'} px-1`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow transition-all" />
                </div>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Storage & Data */}
        <div className="mb-6">
          <span className="section-label">Storage & Data</span>
          <div className="mt-2 premium-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-secondary)]">
                <HiOutlineServerStack className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)] text-[15px]">Local Storage</p>
                <p className="text-[var(--text-muted)] text-[12px]">{storageUsed !== null ? formatBytes(storageUsed) : 'Calculating...'}</p>
              </div>
            </div>
            {storageUsed !== null && (
              <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (storageUsed / (50 * 1024 * 1024)) * 100)}%` }} />
              </div>
            )}
            <motion.button whileTap={{ scale: 0.98 }} onClick={clearStorage}
              className="w-full py-2 text-[13px] font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-[10px] transition-all">
              Clear Local Data
            </motion.button>
          </div>
        </div>

        {/* Wallpaper & Notifications */}
        <div className="mb-6">
          <span className="section-label">Chat</span>
          <div className="mt-2 space-y-2">
            {[
              {
                icon: HiOutlinePhoto,
                label: 'Chat Wallpaper',
                value: wallpaper?.label || 'Default',
                onClick: () => setWallpaperOpen(true),
                iconColor: 'text-[var(--accent-tertiary)]',
                iconBg: 'bg-[var(--accent-glow)]',
              },
              {
                icon: HiOutlineBell,
                label: 'Notifications',
                value: permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not set',
                onClick: requestPermission,
                iconColor: 'text-[var(--warning)]',
                iconBg: 'bg-[var(--warning)]/15',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <motion.button key={item.label} whileTap={{ scale: 0.98 }} onClick={item.onClick}
                  className="w-full premium-card p-4 hover:border-[var(--accent-primary)]/20 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-[10px] ${item.iconBg} flex items-center justify-center ${item.iconColor}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)] text-[15px]">{item.label}</p>
                      <p className="text-[var(--text-muted)] text-[12px]">{item.value}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* About */}
        <div className="mb-6">
          <span className="section-label">About</span>
          <div className="mt-2 premium-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-[var(--hover-bg)] flex items-center justify-center text-[var(--text-muted)]">
                <HiOutlineInformationCircle className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)] text-[15px]">NovaChat</p>
                <p className="text-[var(--text-muted)] text-[12px]">Version 1.0.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 space-y-2">
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowLogoutConfirm(true)}
            className="w-full premium-card p-4 hover:border-[var(--warning)]/40 transition-all text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-[var(--warning)]/15 flex items-center justify-center text-[var(--warning)]">
                <HiOutlineArrowRightOnRectangle className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)] text-[15px]">Sign Out</p>
                <p className="text-[var(--text-muted)] text-[12px]">Sign out from your account</p>
              </div>
            </div>
          </motion.button>

          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowDeleteConfirm(true)}
            className="w-full premium-card p-4 hover:border-[var(--danger)]/40 transition-all text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-[var(--danger-bg)] flex items-center justify-center text-[var(--danger)]">
                <HiOutlineTrash className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--danger)] text-[15px]">Delete Account</p>
                <p className="text-[var(--text-muted)] text-[12px]">Permanently delete your account and data</p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      <WallpaperPicker isOpen={wallpaperOpen} onClose={() => setWallpaperOpen(false)} />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowLogoutConfirm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="w-full max-w-[360px] glass-premium rounded-[24px] p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-[16px] bg-[var(--warning)]/15 flex items-center justify-center mx-auto mb-4">
                <HiOutlineArrowRightOnRectangle className="w-7 h-7 text-[var(--warning)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] text-center mb-2">Sign Out</h3>
              <p className="text-[var(--text-secondary)] text-[14px] text-center mb-6">Are you sure you want to sign out?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-[14px] font-medium text-[14px] hover:bg-[var(--hover-bg-strong)] transition-all">Cancel</button>
                <button onClick={handleLogout} className="flex-1 py-3 bg-[var(--warning)] text-white rounded-[14px] font-medium text-[14px] hover:opacity-90 transition-all">Sign Out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="w-full max-w-[360px] glass-premium rounded-[24px] p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-[16px] bg-[var(--danger-bg)] flex items-center justify-center mx-auto mb-4">
                <HiOutlineTrash className="w-7 h-7 text-[var(--danger)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] text-center mb-2">Delete Account</h3>
              <p className="text-[var(--text-secondary)] text-[13px] text-center mb-4">This action is permanent and cannot be undone. All your messages and data will be lost.</p>
              <p className="text-[var(--text-muted)] text-[12px] text-center mb-4">Type <span className="font-bold text-[var(--danger)]">DELETE</span> to confirm</p>
              <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-primary)] text-[14px] text-center placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/40 focus:border-[var(--danger)]/40 transition-all mb-4" />
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="flex-1 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-[14px] font-medium text-[14px] hover:bg-[var(--hover-bg-strong)] transition-all">Cancel</button>
                <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE'}
                  className="flex-1 py-3 bg-[var(--danger)] text-white rounded-[14px] font-medium text-[14px] hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
