import { useState, useCallback, useRef, useEffect, useMemo, type FormEvent, type MouseEvent, type FocusEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
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
  if (score <= 1) return { label: 'Weak', color: 'var(--danger)', width: '20%' };
  if (score <= 2) return { label: 'Fair', color: 'var(--warning)', width: '40%' };
  if (score <= 3) return { label: 'Good', color: 'var(--success)', width: '60%' };
  if (score <= 4) return { label: 'Strong', color: 'var(--success)', width: '80%' };
  return { label: 'Very Strong', color: 'var(--success)', width: '100%' };
}

function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let idx = 0;
    setDisplayed('');
    setDone(false);
    const start = setTimeout(() => {
      interval = setInterval(() => {
        idx++;
        setDisplayed(text.slice(0, idx));
        if (idx >= text.length) {
          if (interval) clearInterval(interval);
          setDone(true);
        }
      }, 45);
    }, delay);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function NovaTile({ size = 88 }: { size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-center rounded-[26%] shadow-[var(--accent-shadow-lg)] border border-white/15"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-gradient-end))',
      }}
    >
      <NovaLogo size={size * 0.68} />
    </motion.div>
  );
}

function AuthStarField() {
  const stars = useMemo(() => {
    const list: { left: string; top: string; size: number; delay: string; duration: string; purple: boolean }[] = [];
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 44; i++) {
      list.push({
        left: `${(rand() * 100).toFixed(2)}%`,
        top: `${(rand() * 100).toFixed(2)}%`,
        size: rand() > 0.85 ? 2.5 : 1.5,
        delay: `${(rand() * 6).toFixed(2)}s`,
        duration: `${(2.6 + rand() * 3.4).toFixed(2)}s`,
        purple: rand() > 0.72,
      });
    }
    return list;
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s, i) => (
        <span
          key={i}
          className="auth-star absolute rounded-full"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            background: s.purple ? 'var(--accent-tertiary)' : '#FFFFFF',
            opacity: s.purple ? 0.5 : 0.6,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
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
  const [loginErrors, setLoginErrors] = useState<{ email: string; password: string }>({ email: '', password: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);
  const googleBtnRef = useRef<HTMLButtonElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }, []);

  useEffect(() => {
    return () => timersRef.current.forEach((t) => clearTimeout(t));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
    later(() => setToast(null), 4000);
  }, [later]);

  function toggleMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError('');
    setToast(null);
    setFieldErrors(EMPTY_ERRORS);
    setTouched({});
    setLoginErrors({ email: '', password: '' });
    setRegSuccess(false);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    const emailErr = validateEmail(loginEmail);
    const passwordErr = loginPassword ? '' : 'Password is required';
    setLoginErrors({ email: emailErr, password: passwordErr });
    if (emailErr || passwordErr) return;

    setLoading(true);
    try {
      await loginWithEmail(loginEmail, loginPassword);
      showToast('Welcome back!', 'success');
      later(() => navigate('/', { replace: true }), 300);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to login';
      setError(message);
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
      later(() => navigate('/', { replace: true }), 300);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to login with Google';
      setError(message);
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
      later(() => navigate('/', { replace: true }), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const strength = passwordStrength(regPassword);

  const inputClass = (hasError: boolean) =>
    `input-premium w-full px-4 py-3.5 ${hasError ? 'input-error' : ''}`;

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
  };

  const linkClass = 'text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors font-semibold';

  return (
    <div className="h-[100dvh] w-full flex relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Brand doodle-style watermark */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(var(--border-accent) 1px, transparent 1.5px), radial-gradient(var(--border-accent) 1px, transparent 1.5px)',
          backgroundSize: '22px 22px, 22px 22px',
          backgroundPosition: '0 0, 11px 11px',
        }}
      />

      {/* Nebula star particles */}
      <AuthStarField />

      {/* Aurora orbs (whole page, subtle) */}
      <motion.div
        aria-hidden
        className="absolute top-[-18%] left-[-22%] w-[70vmax] h-[70vmax] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 65%)', filter: 'blur(80px)' }}
        animate={{ opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[-28%] right-[-18%] w-[60vmax] h-[60vmax] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 65%)', filter: 'blur(90px)' }}
        animate={{ opacity: [0.06, 0.13, 0.06] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 w-full h-full flex flex-col lg:flex-row">
        {/* Left branding panel (desktop) */}
        <div className="hidden lg:flex lg:w-[48%] xl:w-[52%] flex-col relative overflow-hidden border-r border-[var(--border-primary)]">
          <motion.div
            aria-hidden
            className="absolute -top-1/4 -left-1/4 w-[70%] aspect-square rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)', filter: 'blur(60px)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-1/4 -right-1/4 w-[60%] aspect-square rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)', filter: 'blur(60px)' }}
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.14, 0.24, 0.14] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 flex flex-col flex-1 px-10 xl:px-14 py-10">
            <div className="flex items-center gap-3">
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                <NovaTile size={46} />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-[22px] font-bold text-white tracking-tight"
              >
                Nova<span className="text-[var(--accent-secondary)]">Chat</span>
              </motion.h1>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-[min(42vmin,380px)] aspect-square">
                <div className="absolute inset-0 rounded-full border border-white/10" />
                <div className="absolute inset-[18%] rounded-full border border-white/10" />
                {[
                  { text: 'Hey! 👋', left: '6%', top: '18%', delay: 0.5 },
                  { text: 'NovaChat is 🔒', left: '56%', top: '8%', delay: 1.4 },
                  { text: 'Call me? 📞', left: '8%', top: '66%', delay: 2.2 },
                  { text: 'love the new UI 💜', left: '48%', top: '72%', delay: 3 },
                ].map((b) => (
                  <motion.div
                    key={b.text}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
                    transition={{
                      opacity: { delay: b.delay, duration: 0.4 },
                      scale: { delay: b.delay, duration: 0.4 },
                      y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: b.delay },
                    }}
                    className="absolute z-10 px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-[13px] shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                    style={{ left: b.left, top: b.top }}
                  >
                    {b.text}
                  </motion.div>
                ))}
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <NovaTile size={124} />
                </motion.div>
              </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6 }}>
              <h2 className="text-[30px] font-bold text-white tracking-tight leading-tight mb-3">Messages that feel like magic.</h2>
              <p className="text-white/70 text-[15px] leading-relaxed max-w-[400px]">
                Simple, reliable, and secure messaging for the people in your orbit.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="w-full lg:w-[52%] xl:w-[48%] h-full min-h-0 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-start lg:justify-center px-5 sm:px-8 py-6 sm:py-10 pb-[calc(env(safe-area-inset-bottom)+32px)]">
            <div className="w-full max-w-[420px] flex flex-col">
              {/* Mobile logo + brand */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="lg:hidden flex flex-col items-center mb-8 sm:mb-10"
              >
                <NovaTile size={64} />
                <h2 className="mt-3 text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
                  Nova<span className="text-[var(--accent-primary)]">Chat</span>
                </h2>
              </motion.div>

              {/* Toast */}
              <AnimatePresence>
                {toast && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className={`mb-5 px-4 py-3 rounded-[12px] text-[13px] text-center font-medium ${
                      toast.type === 'success'
                        ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30'
                        : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/40'
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
                    autoComplete="off"
                    className="space-y-5"
                  >
                    {/* Header */}
                    <div className="mb-2">
                      <h2 className="text-[26px] font-bold tracking-tight text-[var(--text-primary)]">
                        <TypingText text="Welcome back" delay={200} />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        className="text-[var(--text-secondary)] text-[14px] mt-1"
                      >
                        Connect with your people.
                      </motion.p>
                    </div>

                    {/* Email */}
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                      <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Email</label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (loginErrors.email) setLoginErrors((p) => ({ ...p, email: '' }));
                        }}
                        placeholder="name@example.com"
                        required
                        autoComplete="off"
                        className={inputClass(!!loginErrors.email)}
                      />
                      <AnimatePresence>
                        {loginErrors.email && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-[var(--danger)] text-[12px] mt-1.5 ml-1"
                          >
                            {loginErrors.email}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Password */}
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                      <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Password</label>
                      <div className="relative">
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            if (loginErrors.password) setLoginErrors((p) => ({ ...p, password: '' }));
                          }}
                          placeholder="Enter your password"
                          required
                          autoComplete="off"
                          className={`${inputClass(!!loginErrors.password)} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors p-1"
                        >
                          {showLoginPassword ? <AiOutlineEyeInvisible className="w-[18px] h-[18px]" /> : <AiOutlineEye className="w-[18px] h-[18px]" />}
                        </button>
                      </div>
                      <AnimatePresence>
                        {loginErrors.password && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-[var(--danger)] text-[12px] mt-1.5 ml-1"
                          >
                            {loginErrors.password}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Forgot Password */}
                    <div className="flex justify-end -mt-1">
                      <button type="button" onClick={() => navigate('/forgot-password')} className="text-[13px] text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors font-medium">
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
                          className="bg-[var(--danger-bg)] border border-[var(--danger)]/40 rounded-[12px] px-4 py-3"
                        >
                          <p className="text-[var(--danger)] text-[13px] text-center">{error}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3.5 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white font-semibold text-[15px] shadow-[var(--accent-shadow-lg)] transition-all duration-300 hover:shadow-[var(--accent-glow-strong)] disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <div className="w-full border-t border-[var(--border-primary)]" />
                      </div>
                      <div className="relative flex justify-center text-[13px]">
                        <span className="px-3 bg-[var(--bg-card)] text-[var(--text-muted)] font-medium">or continue with</span>
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
                      className="google-btn ripple-container w-full py-3.5 bg-[var(--bg-input)] border border-[var(--border-primary)] hover:bg-[var(--hover-bg)] hover:border-[var(--border-accent)] text-[var(--text-primary)] font-medium text-[15px] rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      <FcGoogle className="w-5 h-5" />
                      Google
                    </motion.button>

                    {/* Toggle */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-center text-[var(--text-secondary)] text-[14px] mt-5"
                    >
                      Don&apos;t have an account?{' '}
                      <button type="button" onClick={toggleMode} className={linkClass}>
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
                    autoComplete="off"
                    className="space-y-4"
                  >
                    {/* Header */}
                    <div className="mb-2">
                      <h2 className="text-[26px] font-bold tracking-tight text-[var(--text-primary)]">
                        <TypingText text="Create account" delay={100} />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ delay: 0.75, duration: 0.5 }}
                        className="text-[var(--text-secondary)] text-[14px] mt-1"
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
                            className="w-[72px] h-[72px] rounded-[20px] bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-5 border border-[var(--success)]/40"
                          >
                            <svg className="w-9 h-9 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Account Created!</h3>
                          <p className="text-[var(--text-secondary)] text-[14px]">Redirecting you to the app...</p>
                          <div className="mt-5 flex justify-center">
                            <div className="w-5 h-5 border-2 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin" />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="fields" className="space-y-4">
                          {/* Name */}
                          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Full Name</label>
                            <input
                              type="text" name="displayName" value={regName}
                              onChange={(e) => handleRegChange('displayName', e.target.value)}
                              onBlur={handleRegBlur}
                              placeholder="John Doe" autoComplete="off"
                              className={inputClass(!!(touched.displayName && fieldErrors.displayName))}
                            />
                            <AnimatePresence>
                              {touched.displayName && fieldErrors.displayName && (
                                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="text-[var(--danger)] text-[12px] mt-1.5 ml-1">{fieldErrors.displayName}</motion.p>
                              )}
                            </AnimatePresence>
                          </motion.div>

                          {/* Email */}
                          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Email</label>
                            <input
                              type="email" name="email" value={regEmail}
                              onChange={(e) => handleRegChange('email', e.target.value)}
                              onBlur={handleRegBlur}
                              placeholder="name@example.com" autoComplete="off"
                              className={inputClass(!!(touched.email && fieldErrors.email))}
                            />
                            <AnimatePresence>
                              {touched.email && fieldErrors.email && (
                                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="text-[var(--danger)] text-[12px] mt-1.5 ml-1">{fieldErrors.email}</motion.p>
                              )}
                            </AnimatePresence>
                          </motion.div>

                          {/* Password */}
                          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Password</label>
                            <div className="relative">
                              <input
                                type={showRegPassword ? 'text' : 'password'}
                                name="password" value={regPassword}
                                onChange={(e) => handleRegChange('password', e.target.value)}
                                onBlur={handleRegBlur}
                                placeholder="Min. 6 characters" autoComplete="new-password"
                                className={`${inputClass(!!(touched.password && fieldErrors.password))} pr-12`}
                              />
                              <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors p-1">
                                {showRegPassword ? <AiOutlineEyeInvisible className="w-[18px] h-[18px]" /> : <AiOutlineEye className="w-[18px] h-[18px]" />}
                              </button>
                            </div>
                            {regPassword.length > 0 && (
                              <div className="mt-2.5 ml-1">
                                <div className="h-1.5 bg-[var(--border-primary)] rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: strength.width }}
                                    className="h-full rounded-full" style={{ backgroundColor: strength.color }} />
                                </div>
                                <p className="text-[11px] mt-1 font-medium" style={{ color: strength.color }}>{strength.label}</p>
                              </div>
                            )}
                            <AnimatePresence>
                              {touched.password && fieldErrors.password && (
                                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="text-[var(--danger)] text-[12px] mt-1 ml-1">{fieldErrors.password}</motion.p>
                              )}
                            </AnimatePresence>
                          </motion.div>

                          {/* Confirm */}
                          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Confirm Password</label>
                            <div className="relative">
                              <input
                                type={showRegPassword ? 'text' : 'password'}
                                name="confirmPassword" value={regConfirm}
                                onChange={(e) => handleRegChange('confirmPassword', e.target.value)}
                                onBlur={handleRegBlur}
                                placeholder="Repeat password" autoComplete="new-password"
                                className={inputClass(!!(touched.confirmPassword && fieldErrors.confirmPassword))}
                              />
                              {regConfirm && !fieldErrors.confirmPassword && regConfirm === regPassword && (
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--success)]">
                                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <AnimatePresence>
                              {touched.confirmPassword && fieldErrors.confirmPassword && (
                                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="text-[var(--danger)] text-[12px] mt-1.5 ml-1">{fieldErrors.confirmPassword}</motion.p>
                              )}
                            </AnimatePresence>
                          </motion.div>

                          {/* Error */}
                          <AnimatePresence>
                            {error && (
                              <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                className="bg-[var(--danger-bg)] border border-[var(--danger)]/40 rounded-[12px] px-4 py-3">
                                <p className="text-[var(--danger)] text-[13px] text-center">{error}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Submit */}
                          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
                            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white font-semibold text-[15px] shadow-[var(--accent-shadow-lg)] transition-all duration-300 hover:shadow-[var(--accent-glow-strong)] disabled:opacity-50 disabled:cursor-not-allowed">
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
                          <p className="text-center text-[var(--text-secondary)] text-[14px] mt-4">
                            Already have an account?{' '}
                            <button type="button" onClick={toggleMode} className={linkClass}>
                              Sign In
                            </button>
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.form>
                )}
              </AnimatePresence>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center text-[var(--text-secondary)] text-[12px] mt-8 font-medium"
              >
                Protected by end-to-end encryption
              </motion.p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
