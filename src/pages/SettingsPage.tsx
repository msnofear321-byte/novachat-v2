import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePhoto, HiOutlineBell,
  HiOutlineInformationCircle, HiOutlineSwatch, HiOutlineCommandLine,
  HiOutlineCamera, HiOutlineCheck, HiOutlineArrowRightOnRectangle,
  HiOutlineTrash, HiOutlineUser, HiOutlinePhone, HiOutlineChatBubbleLeftRight,
  HiOutlineClock, HiOutlineChevronRight, HiOutlineArrowLeft,
  HiOutlineServerStack, HiOutlinePhoneArrowUpRight, HiOutlineShieldCheck,
} from 'react-icons/hi2';
import { useTheme, THEMES, FONTS } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useWallpaper } from '@/context/WallpaperContext';
import { useNotifications } from '@/services/notifications';
import { getCallHistory, type CallData } from '@/services/calls';
import WallpaperPicker from '@/components/WallpaperPicker';
import UserAvatar from '@/components/UserAvatar';
import { updateUserProfile } from '@/services/firestore';
import { uploadToCloudinary } from '@/services/cloudinary';
import { getDisplayName } from '@/utils/userDisplay';
import { logout } from '@/services/auth';
import { useState, useRef, useEffect } from 'react';

type SettingsView = 'main' | 'profile' | 'privacy' | 'notifications' | 'appearance' | 'chat' | 'calls' | 'storage' | 'about';

interface NavRow {
  id: SettingsView;
  icon: typeof HiOutlineUser;
  label: string;
  value: string;
}

const viewVariants = {
  enter: (d: number) => ({ opacity: 0, x: d * 42 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -42 }),
};

const viewTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

function SubPageHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-[var(--bg-primary)]/90 backdrop-blur-md px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-3 flex items-center gap-3 border-b border-[var(--border-primary)]">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onBack}
        aria-label="Back"
        className="w-11 h-11 rounded-[13px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-all flex-shrink-0"
      >
        <HiOutlineArrowLeft className="w-[22px] h-[22px]" />
      </motion.button>
      <div className="min-w-0">
        <h1 className="text-[20px] font-bold text-[var(--text-primary)] leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[12px] text-[var(--text-muted)] truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

function SettingToggle({
  label, description, enabled, onChange, accent = false,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
  accent?: boolean;
}) {
  const dot = accent ? 'bg-[var(--accent-primary)]' : 'bg-[var(--success)]';
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={onChange}
      className="w-full premium-card premium-card-hover p-4 hover:border-[var(--accent-primary)]/20 transition-all text-left">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="font-medium text-[var(--text-primary)] text-[16px]">{label}</p>
          <p className="text-[var(--text-muted)] text-[13px] mt-0.5">{description}</p>
        </div>
        <div className={`w-12 h-7 rounded-full transition-all ${enabled ? dot : 'bg-[var(--bg-input)] border border-[var(--border-primary)]'} flex items-center ${enabled ? 'justify-end' : 'justify-start'} px-1 flex-shrink-0`}>
          <div className="w-5 h-5 rounded-full bg-white shadow transition-all" />
        </div>
      </div>
    </motion.button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, font, setTheme, setFont } = useTheme();
  const { user, userProfile } = useAuth();
  const { wallpaper } = useWallpaper();
  const { permission, requestPermission } = useNotifications();
  const [wallpaperOpen, setWallpaperOpen] = useState(false);

  const [view, setView] = useState<SettingsView>('main');
  const [direction, setDirection] = useState(1);
  const open = (v: SettingsView) => { setDirection(1); setView(v); };
  const back = () => { setDirection(-1); setView('main'); };

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
  const [callHistory, setCallHistory] = useState<CallData[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => setStorageUsed(est.usage || 0));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getCallHistory(user.uid)
      .then((calls) => { if (!cancelled) setCallHistory(calls); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCallsLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

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

  function formatCallTime(ts?: number) {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

  const navRows: NavRow[] = [
    { id: 'profile', icon: HiOutlineUser, label: 'Profile', value: userProfile?.displayName || user?.displayName || 'Your info' },
    { id: 'privacy', icon: HiOutlineShieldCheck, label: 'Privacy & Security', value: 'Read receipts, last seen, typing' },
    { id: 'notifications', icon: HiOutlineBell, label: 'Notifications', value: permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Sounds & alerts' },
    { id: 'appearance', icon: HiOutlineSwatch, label: 'Appearance', value: `${currentTheme?.label || 'Dark'} theme` },
    { id: 'chat', icon: HiOutlineChatBubbleLeftRight, label: 'Chat Settings', value: `Wallpaper: ${wallpaper?.label || 'Default'}` },
    { id: 'calls', icon: HiOutlinePhoneArrowUpRight, label: 'Calls', value: `${callHistory.length} recent call${callHistory.length === 1 ? '' : 's'}` },
    { id: 'storage', icon: HiOutlineServerStack, label: 'Storage & Data', value: storageUsed !== null ? formatBytes(storageUsed) : 'Local storage' },
    { id: 'about', icon: HiOutlineInformationCircle, label: 'About', value: 'NovaChat version 1.0.0' },
  ];

  const inputCls =
    'w-full bg-transparent text-[var(--text-primary)] text-[15px] focus:outline-none placeholder-[var(--text-muted)]';

  return (
    <div className="h-full bg-[var(--bg-primary)] overflow-hidden">
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={view}
          custom={direction}
          variants={viewVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={viewTransition}
          className="h-full overflow-y-auto custom-scrollbar"
        >
          {view === 'main' ? (
            <div className="max-w-[640px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <h1 className="text-[26px] font-bold text-[var(--text-primary)]">Settings</h1>
              </div>

              {/* Profile Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="premium-card premium-card-hover p-5 mb-6"
              >
                <div className="flex items-center gap-4">
                  <UserAvatar photoURL={user?.photoURL ?? undefined} displayName={getDisplayName({ displayName: user?.displayName, email: user?.email, phone: user?.phoneNumber }) || '?'} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] text-[17px] truncate">{userProfile?.displayName || user?.displayName || 'User'}</p>
                    <p className="text-[var(--text-secondary)] text-[14px] truncate">{user?.email}</p>
                    {userProfile?.about && (
                      <p className="text-[var(--text-muted)] text-[13px] truncate mt-0.5">{userProfile.about}</p>
                    )}
                  </div>
                  <button onClick={() => open('profile')}
                    className="px-4 py-2 text-[14px] font-medium text-[var(--accent-primary)] bg-[var(--accent-glow)] rounded-[12px] hover:bg-[var(--accent-primary)]/20 transition-all flex-shrink-0">
                    Edit
                  </button>
                </div>
              </motion.div>

              {/* Nav list */}
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } } }}
                className="premium-card overflow-hidden"
              >
                {navRows.map((row, i) => {
                  const Icon = row.icon;
                  return (
                    <motion.button
                      key={row.id}
                      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                      onClick={() => open(row.id)}
                      className={`w-full flex items-center gap-3.5 px-4 py-4 text-left hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg-strong)] transition-colors ${i > 0 ? 'border-t border-[var(--border-primary)]' : ''}`}
                    >
                      <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 ${i % 3 === 0 ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)]' : i % 3 === 1 ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--warning)]/10 text-[var(--warning)]'}`}>
                        <Icon className="w-[22px] h-[22px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-primary)] text-[15px] truncate">{row.label}</p>
                        <p className="text-[var(--text-muted)] text-[13px] truncate">{row.value}</p>
                      </div>
                      <HiOutlineChevronRight className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Danger Zone */}
              <div className="mt-6 space-y-2">
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowLogoutConfirm(true)}
                  className="w-full premium-card premium-card-hover p-4 hover:border-[var(--warning)]/40 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[11px] bg-[var(--warning)]/15 flex items-center justify-center text-[var(--warning)]">
                      <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)] text-[15px]">Sign Out</p>
                      <p className="text-[var(--text-muted)] text-[13px]">Sign out from your account</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowDeleteConfirm(true)}
                  className="w-full premium-card premium-card-hover p-4 hover:border-[var(--danger)]/40 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[11px] bg-[var(--danger-bg)] flex items-center justify-center text-[var(--danger)]">
                      <HiOutlineTrash className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--danger)] text-[15px]">Delete Account</p>
                      <p className="text-[var(--text-muted)] text-[13px]">Permanently delete your account and data</p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          ) : view === 'profile' ? (
            <div className="max-w-[600px] mx-auto">
              <SubPageHeader title="Profile" subtitle="Edit your personal information" onBack={back} />
              <div className="px-4 sm:px-6 py-5">
                {/* Photo */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative group">
                    <UserAvatar photoURL={user?.photoURL ?? undefined} displayName={getDisplayName({ displayName: user?.displayName, email: user?.email, phone: user?.phoneNumber }) || '?'} size="lg" />
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
                </div>
                {user?.photoURL && (
                  <div className="flex justify-center mb-6">
                    <button onClick={handleRemovePhoto}
                      className="flex items-center gap-1 text-[12px] font-medium text-[var(--danger)] hover:underline transition-all">
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                      Remove photo
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="premium-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
                        <HiOutlineUser className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[12px] text-[var(--text-muted)] mb-1 block">Display Name</label>
                        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                          className={inputCls} />
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
                          className={inputCls} />
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
                          className={inputCls} />
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
            </div>
          ) : view === 'privacy' ? (
            <div className="max-w-[600px] mx-auto">
              <SubPageHeader title="Privacy & Security" subtitle="Control your visibility" onBack={back} />
              <div className="px-4 sm:px-6 py-5 space-y-2">
                <SettingToggle
                  label="Read Receipts"
                  description={showReadReceipts ? 'Others can see when you read messages' : 'Read receipts are hidden'}
                  enabled={showReadReceipts}
                  onChange={toggleReadReceipts}
                />
                <SettingToggle
                  label="Last Seen"
                  description={showLastSeen ? 'Others can see your last seen time' : 'Last seen is hidden'}
                  enabled={showLastSeen}
                  onChange={toggleLastSeen}
                />
                <SettingToggle
                  label="Typing Indicators"
                  description={showTypingIndicators ? 'Others see when you are typing' : 'Typing indicators are hidden'}
                  enabled={showTypingIndicators}
                  onChange={toggleTypingIndicators}
                />
                <div className="premium-card p-4 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--hover-bg)] flex items-center justify-center text-[var(--text-muted)]">
                      <HiOutlineClock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)] text-[14px]">Online Presence</p>
                      <p className="text-[var(--text-muted)] text-[12px]">Shown to everyone while the app is open</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : view === 'notifications' ? (
            <div className="max-w-[600px] mx-auto">
              <SubPageHeader title="Notifications" subtitle="Sounds and alerts" onBack={back} />
              <div className="px-4 sm:px-6 py-5 space-y-2">
                <SettingToggle
                  label="Message Sounds"
                  description="Play sound for new messages"
                  enabled={notifSound}
                  onChange={toggleNotifSound}
                  accent
                />
                <motion.button whileTap={{ scale: 0.98 }} onClick={requestPermission}
                  className="w-full premium-card p-4 hover:border-[var(--accent-primary)]/20 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--warning)]/15 flex items-center justify-center text-[var(--warning)]">
                      <HiOutlineBell className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)] text-[15px]">Browser Notifications</p>
                      <p className="text-[var(--text-muted)] text-[12px]">
                        {permission === 'granted' ? 'Notifications are enabled' : permission === 'denied' ? 'Notifications are blocked in your browser' : 'Tap to allow notifications'}
                      </p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          ) : view === 'appearance' ? (
            <div className="max-w-[600px] mx-auto">
              <SubPageHeader title="Appearance" subtitle="Theme and typography" onBack={back} />
              <div className="px-4 sm:px-6 py-5">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
          ) : view === 'chat' ? (
            <div className="max-w-[600px] mx-auto">
              <SubPageHeader title="Chat Settings" subtitle="Wallpaper and chat options" onBack={back} />
              <div className="px-4 sm:px-6 py-5 space-y-2">
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => setWallpaperOpen(true)}
                  className="w-full premium-card p-4 hover:border-[var(--accent-primary)]/20 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-tertiary)]">
                      <HiOutlinePhoto className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)] text-[15px]">Chat Wallpaper</p>
                      <p className="text-[var(--text-muted)] text-[12px]">{wallpaper?.label || 'Default'}</p>
                    </div>
                    <HiOutlineChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                </motion.button>
              </div>
            </div>
          ) : view === 'calls' ? (
            <div className="max-w-[600px] mx-auto">
              <SubPageHeader title="Calls" subtitle="Voice and video call activity" onBack={back} />
              <div className="px-4 sm:px-6 py-5">
                <div className="premium-card p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
                      <HiOutlinePhoneArrowUpRight className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)] text-[15px]">NovaChat Calls</p>
                      <p className="text-[var(--text-muted)] text-[12px]">Secure peer-to-peer voice & video calls</p>
                    </div>
                  </div>
                </div>
                <span className="section-label mb-2 block">Recent</span>
                {callsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : callHistory.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-[var(--text-muted)] text-[14px]">No calls yet</p>
                    <p className="text-[var(--text-muted)] text-[12px] mt-1">Call someone from any chat</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {callHistory.map((call) => (
                      <div key={call.id} className="premium-card p-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[var(--success)]/10 text-[var(--success)]">
                          <HiOutlinePhoneArrowUpRight className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text-primary)] text-[14px] truncate">
                            {call.callerId === user?.uid ? call.receiverName || 'Call' : call.callerName || 'Call'}
                          </p>
                          <p className="text-[var(--text-muted)] text-[12px] capitalize">
                            {call.type} · {call.status}
                            {call.duration ? ` · ${Math.max(1, Math.round(call.duration / 1000))}s` : ''}
                          </p>
                        </div>
                        <span className="text-[var(--text-muted)] text-[11px] flex-shrink-0">{formatCallTime(call.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : view === 'storage' ? (
            <div className="max-w-[600px] mx-auto">
              <SubPageHeader title="Storage & Data" subtitle="Manage local data" onBack={back} />
              <div className="px-4 sm:px-6 py-5">
                <div className="premium-card p-4">
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
            </div>
          ) : (
            <div className="max-w-[600px] mx-auto">
              <SubPageHeader title="About" subtitle="NovaChat" onBack={back} />
              <div className="px-4 sm:px-6 py-5">
                <div className="premium-card p-5 mb-4 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] flex items-center justify-center shadow-[var(--accent-shadow)] mb-3">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-[18px] font-bold text-[var(--text-primary)]">NovaChat</p>
                  <p className="text-[var(--text-muted)] text-[13px] mt-1">Version 1.0.0</p>
                </div>
                <div className="premium-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--hover-bg)] flex items-center justify-center text-[var(--text-muted)]">
                      <HiOutlineInformationCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)] text-[14px]">Made with love</p>
                      <p className="text-[var(--text-muted)] text-[12px]">Premium messaging for everyone</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

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
