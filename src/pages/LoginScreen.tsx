import { useState, useCallback, useRef, type FormEvent, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineEnvelope, HiOutlineLockClosed } from 'react-icons/hi2';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import AuthLayout from '@/components/AuthLayout';
import { loginWithEmail, loginWithGoogle } from '@/services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLButtonElement>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
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
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    btn.style.setProperty('--ripple-x', `${x}%`);
    btn.style.setProperty('--ripple-y', `${y}%`);
  }

  return (
    <AuthLayout mode="login" onToggle={() => {}}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`mb-5 px-4 py-3 rounded-[14px] text-[13px] text-center font-medium ${
              toast.type === 'success'
                ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/20'
                : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/20'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleEmailLogin} className="space-y-5">
        {/* Email */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
        >
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Email</label>
          <div className="relative group">
            <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full pl-11 pr-4 py-3.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[16px] text-[var(--text-primary)] text-[15px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/40 focus:bg-[var(--bg-input-focus)] transition-all duration-200"
            />
          </div>
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Password</label>
          <div className="relative group">
            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full pl-11 pr-12 py-3.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[16px] text-[var(--text-primary)] text-[15px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/40 focus:bg-[var(--bg-input-focus)] transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-0.5"
            >
              {showPassword ? <AiOutlineEyeInvisible className="w-[18px] h-[18px]" /> : <AiOutlineEye className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </motion.div>

        {/* Forgot Password */}
        <div className="flex justify-end -mt-1">
          <Link to="/forgot-password" className="text-[13px] text-[var(--accent-secondary)] hover:text-[var(--accent-tertiary)] transition-colors font-medium">
            Forgot password?
          </Link>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              className="bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[14px] px-4 py-3"
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
          className="btn-primary w-full"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : (
            'Sign In'
          )}
        </motion.button>

        {/* Divider */}
        <div className="relative my-6">
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
          className="ripple-container w-full py-3.5 bg-[var(--bg-input)] border border-[var(--border-primary)] hover:bg-[var(--hover-bg-strong)] hover:border-[var(--border-accent)] text-[var(--text-primary)] font-medium text-[15px] rounded-[16px] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:shadow-[var(--shadow-glow)]"
        >
          <FcGoogle className="w-5 h-5" />
          Google
        </motion.button>

        {/* Sign Up Link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[var(--text-secondary)] text-[14px] mt-6"
        >
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-[var(--accent-secondary)] hover:text-[var(--accent-tertiary)] font-semibold transition-colors">
            Sign Up
          </Link>
        </motion.p>
      </form>
    </AuthLayout>
  );
}
