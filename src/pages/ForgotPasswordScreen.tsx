import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { resetPassword } from '@/services/auth';

function validateEmail(email: string): string {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email';
  return '';
}

function NovaLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      setFieldError(emailErr);
      setError('');
      return;
    }
    setError('');
    setFieldError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    if (fieldError) setFieldError('');
    if (error) setError('');
  }

  const inputClass = `w-full px-4 py-3.5 bg-[var(--bg-input)] border rounded-[12px] text-[var(--text-primary)] text-[15px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow-strong)] focus:border-[var(--border-accent)] transition-all duration-200 ${
    fieldError ? 'border-[var(--danger)]' : 'border-[var(--border-primary)]'
  }`;

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

      {/* Aurora orbs */}
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

      <div className="relative z-10 w-full h-full flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-[400px] flex flex-col flex-1 px-5 sm:px-8 py-6 sm:py-10 pb-[calc(env(safe-area-inset-bottom)+32px)]">
          {/* Logo + brand */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center mb-8 sm:mb-10"
          >
            <div
              className="w-[64px] h-[64px] rounded-[20px] flex items-center justify-center shadow-[var(--accent-shadow-lg)] border border-white/15"
              style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-gradient-end))' }}
            >
              <NovaLogo />
            </div>
            <h2 className="mt-3 text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
              Nova<span className="text-[var(--accent-primary)]">Chat</span>
            </h2>
          </motion.div>

          {sent ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col justify-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                className="w-[72px] h-[72px] rounded-[20px] bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-5 border border-[var(--success)]/40"
              >
                <svg className="w-9 h-9 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </motion.div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Check your email</h2>
              <p className="text-[var(--text-secondary)] text-[14px] mb-6">
                We&apos;ve sent a password reset link to{' '}
                <span className="text-[var(--text-primary)] font-medium">{email}</span>
              </p>
              <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] font-medium text-[14px] transition-colors">
                Back to Sign In
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="flex-1 flex flex-col justify-center"
            >
              <div className="mb-6">
                <h2 className="text-[26px] font-bold tracking-tight text-[var(--text-primary)] mb-1">Reset Password</h2>
                <p className="text-[var(--text-secondary)] text-[14px]">Enter your email and we&apos;ll send you a reset link</p>
              </div>

              <form onSubmit={handleReset} autoComplete="off" className="space-y-5">
                <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Email</label>
                  <input
                    type="email" value={email} onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="name@example.com" required autoComplete="off"
                    className={inputClass}
                  />
                  <AnimatePresence>
                    {fieldError && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[var(--danger)] text-[12px] mt-1.5 ml-1"
                      >
                        {fieldError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--danger-bg)] border border-[var(--danger)]/40 rounded-[12px] px-4 py-3">
                    <p className="text-[var(--danger)] text-[13px] text-center">{error}</p>
                  </motion.div>
                )}

                <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white font-semibold text-[15px] shadow-[var(--accent-shadow-lg)] transition-all duration-300 hover:shadow-[var(--accent-glow-strong)] disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Send Reset Link'}
                </motion.button>

                <div className="text-center">
                  <button type="button" onClick={() => navigate('/login')} className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] text-[14px] transition-colors">
                    Back to Sign In
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          <p className="mt-8 text-center text-[var(--text-secondary)] text-[12px] font-medium">
            Protected by end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  );
}
