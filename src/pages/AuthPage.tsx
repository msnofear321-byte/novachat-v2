import { useState, useCallback, useRef, useEffect, type FormEvent, type MouseEvent, type FocusEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi2';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { loginWithEmail, loginWithGoogle, registerWithEmail } from '@/services/auth';

interface FieldErrors {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_ERRORS: FieldErrors = { displayName: '', email: '', password: '', confirmPassword: '' };

function validateEmail(email: string): string {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
  return '';
}

function validateName(name: string): string {
  if (!name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'At least 2 characters';
  return '';
}

function validatePassword(pw: string): string {
  if (!pw) return 'Password is required';
  if (pw.length < 6) return 'Min. 6 characters';
  return '';
}

function validateConfirm(pw: string, confirm: string): string {
  if (!confirm) return 'Please confirm your password';
  if (pw !== confirm) return 'Passwords do not match';
  return '';
}

function passwordStrength(pw: string) {
  if (!pw) return { label: '', color: 'transparent', width: '0%' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: '#EF4444', width: '20%' };
  if (score <= 2) return { label: 'Fair', color: '#F59E0B', width: '40%' };
  if (score <= 3) return { label: 'Good', color: '#3B82F6', width: '60%' };
  if (score <= 4) return { label: 'Strong', color: '#22C55E', width: '80%' };
  return { label: 'Very Strong', color: '#22C55E', width: '100%' };
}

function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let idx = 0;
    setDisplayed('');
    setDone(false);
    const start = setTimeout(() => {
      const interval = setInterval(() => {
        idx++;
        setDisplayed(text.slice(0, idx));
        if (idx >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, 45);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(start);
  }, [text, delay]);

  return (
    <span>
      {displayed}
      {!done && <span className="typing-cursor" />}
    </span>
  );
}

function NovaLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect x="6" y="6" width="52" height="52" rx="16" fill="rgba(124,58,237,0.1)" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5" />
      <text x="32" y="43" textAnchor="middle" fill="#A78BFA" fontFamily="Inter, system-ui" fontWeight="800" fontSize="30">N</text>
      <circle cx="50" cy="15" r="3.5" fill="#06B6D4" />
    </svg>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_ERRORS);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);
  const googleBtnRef = useRef<HTMLButtonElement>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  function toggleMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError('');
    setToast(null);
    setFieldErrors(EMPTY_ERRORS);
    setTouched({});
    setRegSuccess(false);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(loginEmail, loginPassword);
      showToast('Welcome back!', 'success');
      setTimeout(() => navigate('/', { replace: true }), 300);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to login';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      showToast('Welcome back!', 'success');
      setTimeout(() => navigate('/', { replace: true }), 300);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to login with Google';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleRipple(e: MouseEvent<HTMLButtonElement>) {
    const btn = googleBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--ripple-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    btn.style.setProperty('--ripple-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }

  function handleRegBlur(e: FocusEvent<HTMLInputElement>) {
    const field = e.target.name as keyof FieldErrors;
    const value = e.target.value;
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (field === 'displayName') next.displayName = validateName(value);
      else if (field === 'email') next.email = validateEmail(value);
      else if (field === 'password') {
        next.password = validatePassword(value);
        if (touched.confirmPassword) next.confirmPassword = validateConfirm(value, regConfirm);
      } else if (field === 'confirmPassword') next.confirmPassword = validateConfirm(regPassword, value);
      return next;
    });
  }

  function handleRegChange(field: keyof FieldErrors, value: string) {
    if (field === 'displayName') setRegName(value);
    else if (field === 'email') setRegEmail(value);
    else if (field === 'password') setRegPassword(value);
    else if (field === 'confirmPassword') setRegConfirm(value);

    if (touched[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (field === 'displayName') next.displayName = validateName(value);
        else if (field === 'email') next.email = validateEmail(value);
        else if (field === 'password') {
          next.password = validatePassword(value);
          if (touched.confirmPassword) next.confirmPassword = validateConfirm(value, regConfirm);
        } else if (field === 'confirmPassword') next.confirmPassword = validateConfirm(regPassword, value);
        return next;
      });
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    const newErrors: FieldErrors = {
      displayName: validateName(regName),
      email: validateEmail(regEmail),
      password: validatePassword(regPassword),
      confirmPassword: validateConfirm(regPassword, regConfirm),
    };
    setFieldErrors(newErrors);
    setTouched({ displayName: true, email: true, password: true, confirmPassword: true });
    if (Object.values(newErrors).some((e) => e !== '')) return;

    setLoading(true);
    try {
      await registerWithEmail(regEmail.trim(), regPassword, regName.trim());
      setRegSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const strength = passwordStrength(regPassword);

  const inputClass = (hasError: boolean) =>
    `w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border rounded-[14px] text-white text-[15px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 focus:bg-white/[0.06] transition-all duration-300 ${
      hasError ? 'border-red-500/50' : 'border-white/[0.08]'
    }`;

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden" style={{ background: '#050505' }}>
      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute bottom-[-15%] right-[-8%] w-[500px] h-[500px] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-[40%] left-[50%] w-[350px] h-[350px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(192,132,252,0.08), transparent 70%)' }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 3.3) % 100}%`,
              top: `${(i * 3.7 + 5) % 100}%`,
              width: (i % 3) + 1,
              height: (i % 3) + 1,
              background: i % 3 === 0 ? 'rgba(124,58,237,0.4)' : 'rgba(168,85,247,0.3)',
            }}
            animate={{
              y: [0, -((i % 5) * 12 + 20), 0],
              x: [0, ((i % 4) * 10 - 20), 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: (i % 6) + 6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: (i % 5),
            }}
          />
        ))}
      </div>

      {/* Left Panel (desktop) */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#0a0a10] to-[#050505]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-[420px]">
          {/* Logo with glow rings */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-12"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-[-16px] rounded-[42px] border-2 border-purple-400/20"
              style={{ boxShadow: '0 0 30px rgba(124,58,237,0.15), inset 0 0 30px rgba(124,58,237,0.05)' }}
            />
            <motion.div
              animate={{ scale: [1, 1.04, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute inset-[-8px] rounded-[36px] border border-purple-400/30"
              style={{ boxShadow: '0 0 20px rgba(124,58,237,0.2)' }}
            />
            <div
              className="relative w-[120px] h-[120px] rounded-[32px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.15))',
                border: '1px solid rgba(124,58,237,0.3)',
                boxShadow: '0 0 40px rgba(124,58,237,0.2), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <svg className="w-16 h-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[28px] left-[38px] w-[5px] h-[5px] rounded-full bg-purple-400/60"
              />
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                className="absolute top-[28px] left-[50px] w-[5px] h-[5px] rounded-full bg-purple-400/60"
              />
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                className="absolute top-[28px] left-[62px] w-[5px] h-[5px] rounded-full bg-purple-400/60"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-center"
          >
            <h1 className="text-[44px] font-bold text-white tracking-tight leading-tight mb-4">
              Nova<span className="text-purple-400">Chat</span>
            </h1>
            <p className="text-[17px] text-white/50 font-medium leading-relaxed max-w-[300px]">
              End-to-end encrypted messaging with crystal-clear voice and video calls
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="flex flex-wrap gap-3 mt-10 justify-center"
          >
            {['End-to-End Encrypted', 'Voice & Video Calls', 'Status & Stories'].map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="px-4 py-2 rounded-full text-[13px] font-medium text-purple-300/70 border border-purple-400/15 bg-purple-400/5"
              >
                {feature}
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-14 relative"
          >
            <div className="flex gap-5 items-end">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="w-[100px] h-[180px] rounded-[18px] border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden relative"
                style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
              >
                <div className="absolute inset-x-2 top-3 h-2 rounded-full bg-white/10" />
                <div className="absolute inset-x-3 top-7 space-y-1.5">
                  <div className="h-1.5 rounded-full bg-purple-400/20 w-3/4" />
                  <div className="h-1.5 rounded-full bg-white/10 w-1/2" />
                  <div className="h-1.5 rounded-full bg-white/10 w-2/3" />
                </div>
                <div className="absolute inset-x-3 top-16 space-y-2">
                  <div className="flex gap-1.5">
                    <div className="h-6 rounded-lg bg-purple-400/15 flex-1" />
                    <div className="h-6 rounded-lg bg-white/5 w-8" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-6 rounded-lg bg-white/5 w-8" />
                    <div className="h-6 rounded-lg bg-purple-400/15 flex-1" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-[130px] h-[230px] rounded-[22px] border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden relative"
                style={{ boxShadow: '0 15px 40px rgba(0,0,0,0.4), 0 0 30px rgba(124,58,237,0.1)' }}
              >
                <div className="absolute inset-x-3 top-4 h-2.5 rounded-full bg-white/10" />
                <div className="absolute inset-x-3 top-9 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-400/20" />
                    <div className="h-1.5 rounded-full bg-white/15 w-16" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-400/20" />
                    <div className="h-1.5 rounded-full bg-white/15 w-20" />
                  </div>
                </div>
                <div className="absolute inset-x-3 top-22 space-y-2">
                  <div className="flex justify-end">
                    <div className="h-8 rounded-xl rounded-tr-sm bg-purple-400/20 w-2/3" />
                  </div>
                  <div className="flex justify-start">
                    <div className="h-8 rounded-xl rounded-tl-sm bg-white/10 w-1/2" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-10 rounded-xl rounded-tr-sm bg-purple-400/20 w-3/4" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="w-[90px] h-[160px] rounded-[16px] border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden relative"
                style={{ boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}
              >
                <div className="absolute inset-x-2 top-3 h-2 rounded-full bg-white/10" />
                <div className="absolute inset-x-2 top-7 space-y-1">
                  <div className="h-12 rounded-lg bg-gradient-to-br from-purple-400/15 to-purple-500/15" />
                  <div className="h-1.5 rounded-full bg-white/10 w-2/3" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel (Form) */}
      <div className="w-full lg:w-[50%] xl:w-[45%] flex items-center justify-center p-6 sm:p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#050505]/50 to-[#050505]" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile logo */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden text-center mb-8"
          >
            <div className="inline-flex items-center justify-center mb-4">
              <NovaLogo size={64} />
            </div>
            <h2 className="text-[28px] font-bold text-white tracking-tight">
              Nova<span className="text-purple-400">Chat</span>
            </h2>
          </motion.div>

          {/* Neon glass card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="neon-glass rounded-[28px] p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.03), transparent)',
                width: '50%',
              }}
            />

            {/* Toast */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className={`mb-5 px-4 py-3 rounded-[14px] text-[13px] text-center font-medium ${
                    toast.type === 'success'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {toast.message}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait" custom={mode === 'login' ? 1 : -1}>
              {mode === 'login' ? (
                <motion.form
                  key="login"
                  custom={1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  {/* Header */}
                  <div className="mb-2">
                    <h2 className="text-[26px] font-bold tracking-tight text-white auth-header-glow">
                      <TypingText text="Welcome back" delay={200} />
                    </h2>
                    <motion.p
                      initial={{ opacity: 0, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      className="text-white/40 text-[14px] mt-1"
                    >
                      Sign in to continue to NovaChat
                    </motion.p>
                  </div>

                  {/* Email */}
                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <label className="block text-[13px] font-medium text-white/50 mb-2 ml-1">Email</label>
                    <div className="relative group">
                      <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 group-focus-within:text-purple-400 transition-colors" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder=""
                        required
                        className={inputClass(false)}
                      />
                    </div>
                  </motion.div>

                  {/* Password */}
                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                    <label className="block text-[13px] font-medium text-white/50 mb-2 ml-1">Password</label>
                    <div className="relative group">
                      <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 group-focus-within:text-purple-400 transition-colors" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder=""
                        required
                        className={`${inputClass(false)} !pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-0.5"
                      >
                        {showLoginPassword ? <AiOutlineEyeInvisible className="w-[18px] h-[18px]" /> : <AiOutlineEye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </motion.div>

                  {/* Forgot Password */}
                  <div className="flex justify-end -mt-1">
                    <button type="button" onClick={() => navigate('/forgot-password')} className="text-[13px] text-purple-400 hover:text-purple-300 transition-colors font-medium">
                      Forgot password?
                    </button>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-[14px] px-4 py-3"
                      >
                        <p className="text-red-400 text-[13px] text-center">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.98 }}
                    className="neon-btn w-full"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      'Sign In'
                    )}
                  </motion.button>

                  {/* Divider */}
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/[0.08]" />
                    </div>
                    <div className="relative flex justify-center text-[13px]">
                      <span className="px-3 bg-transparent text-white/30 font-medium">or continue with</span>
                    </div>
                  </div>

                  {/* Google Button */}
                  <motion.button
                    ref={googleBtnRef}
                    type="button"
                    onClick={(e) => { handleRipple(e); handleGoogleLogin(); }}
                    disabled={loading}
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.01 }}
                    className="google-btn ripple-container w-full py-3.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-purple-500/30 hover:shadow-[0_0_24px_rgba(124,58,237,0.12)] text-white font-medium text-[15px] rounded-[14px] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    <FcGoogle className="w-5 h-5" />
                    Google
                  </motion.button>

                  {/* Toggle */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center text-white/40 text-[14px] mt-5"
                  >
                    Don&apos;t have an account?{' '}
                    <button type="button" onClick={toggleMode} className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                      Sign Up
                    </button>
                  </motion.p>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  custom={-1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  {/* Header */}
                  <div className="mb-2">
                    <h2 className="text-[26px] font-bold tracking-tight text-white auth-header-glow">
                      <TypingText text="Create account" delay={100} />
                    </h2>
                    <motion.p
                      initial={{ opacity: 0, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      transition={{ delay: 0.75, duration: 0.5 }}
                      className="text-white/40 text-[14px] mt-1"
                    >
                      Join NovaChat and start messaging
                    </motion.p>
                  </div>

                  <AnimatePresence mode="wait">
                    {regSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                          className="w-[72px] h-[72px] rounded-[20px] bg-green-500/10 flex items-center justify-center mx-auto mb-5 border border-green-500/20"
                        >
                          <svg className="w-9 h-9 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                        <h3 className="text-xl font-semibold text-white mb-2">Account Created!</h3>
                        <p className="text-white/40 text-[14px]">Redirecting you to the app...</p>
                        <div className="mt-5 flex justify-center">
                          <div className="w-5 h-5 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="fields" className="space-y-4">
                        {/* Name */}
                        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                          <label className="block text-[13px] font-medium text-white/50 mb-2 ml-1">Full Name</label>
                          <div className="relative group">
                            <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 group-focus-within:text-purple-400 transition-colors" />
                            <input
                              type="text" name="displayName" value={regName}
                              onChange={(e) => handleRegChange('displayName', e.target.value)}
                              onBlur={handleRegBlur}
                              placeholder="" autoComplete="name"
                              className={inputClass(!!(touched.displayName && fieldErrors.displayName))}
                            />
                          </div>
                          <AnimatePresence>
                            {touched.displayName && fieldErrors.displayName && (
                              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="text-red-400 text-[12px] mt-1.5 ml-1">{fieldErrors.displayName}</motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        {/* Email */}
                        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                          <label className="block text-[13px] font-medium text-white/50 mb-2 ml-1">Email</label>
                          <div className="relative group">
                            <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 group-focus-within:text-purple-400 transition-colors" />
                            <input
                              type="email" name="email" value={regEmail}
                              onChange={(e) => handleRegChange('email', e.target.value)}
                              onBlur={handleRegBlur}
                              placeholder="" autoComplete="email"
                              className={inputClass(!!(touched.email && fieldErrors.email))}
                            />
                          </div>
                          <AnimatePresence>
                            {touched.email && fieldErrors.email && (
                              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="text-red-400 text-[12px] mt-1.5 ml-1">{fieldErrors.email}</motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        {/* Password */}
                        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                          <label className="block text-[13px] font-medium text-white/50 mb-2 ml-1">Password</label>
                          <div className="relative group">
                            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 group-focus-within:text-purple-400 transition-colors" />
                            <input
                              type={showRegPassword ? 'text' : 'password'}
                              name="password" value={regPassword}
                              onChange={(e) => handleRegChange('password', e.target.value)}
                              onBlur={handleRegBlur}
                              placeholder="" autoComplete="new-password"
                              className={`${inputClass(!!(touched.password && fieldErrors.password))} !pr-12`}
                            />
                            <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-0.5">
                              {showRegPassword ? <AiOutlineEyeInvisible className="w-[18px] h-[18px]" /> : <AiOutlineEye className="w-[18px] h-[18px]" />}
                            </button>
                          </div>
                          {regPassword.length > 0 && (
                            <div className="mt-2.5 ml-1">
                              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: strength.width }}
                                  className="h-full rounded-full" style={{ backgroundColor: strength.color }} />
                              </div>
                              <p className="text-[11px] mt-1 font-medium" style={{ color: strength.color }}>{strength.label}</p>
                            </div>
                          )}
                          <AnimatePresence>
                            {touched.password && fieldErrors.password && (
                              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="text-red-400 text-[12px] mt-1 ml-1">{fieldErrors.password}</motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        {/* Confirm */}
                        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                          <label className="block text-[13px] font-medium text-white/50 mb-2 ml-1">Confirm Password</label>
                          <div className="relative group">
                            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 group-focus-within:text-purple-400 transition-colors" />
                            <input
                              type={showRegPassword ? 'text' : 'password'}
                              name="confirmPassword" value={regConfirm}
                              onChange={(e) => handleRegChange('confirmPassword', e.target.value)}
                              onBlur={handleRegBlur}
                              placeholder="" autoComplete="new-password"
                              className={inputClass(!!(touched.confirmPassword && fieldErrors.confirmPassword))}
                            />
                            {regConfirm && !fieldErrors.confirmPassword && regConfirm === regPassword && (
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 animate-bounce-in">
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                          </div>
                          <AnimatePresence>
                            {touched.confirmPassword && fieldErrors.confirmPassword && (
                              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="text-red-400 text-[12px] mt-1.5 ml-1">{fieldErrors.confirmPassword}</motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        {/* Error */}
                        <AnimatePresence>
                          {error && (
                            <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
                              className="bg-red-500/10 border border-red-500/20 rounded-[14px] px-4 py-3">
                              <p className="text-red-400 text-[13px] text-center">{error}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Submit */}
                        <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
                          className="neon-btn w-full">
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Creating Account...</span>
                            </div>
                          ) : (
                            'Create Account'
                          )}
                        </motion.button>

                        {/* Toggle */}
                        <p className="text-center text-white/40 text-[14px] mt-4">
                          Already have an account?{' '}
                          <button type="button" onClick={toggleMode} className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                            Sign In
                          </button>
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-white/15 text-[12px] mt-6 font-medium"
          >
            Protected by end-to-end encryption
          </motion.p>
        </div>
      </div>
    </div>
  );
}
