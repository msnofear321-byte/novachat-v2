import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineEnvelope } from 'react-icons/hi2';
import { resetPassword } from '@/services/auth';

function validateEmail(email: string): string {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email';
  return '';
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

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center px-4 py-8 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Brand doodle-style watermark */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(var(--border-accent) 1px, transparent 1.5px), radial-gradient(var(--border-accent) 1px, transparent 1.5px)',
          backgroundSize: '22px 22px, 22px 22px',
          backgroundPosition: '0 0, 11px 11px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px] relative z-10"
      >
        {/* Card */}
        <div className="glass-strong rounded-[28px] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-gradient-end)]" />

          {sent ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
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
            <>
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-[72px] h-[72px] rounded-[24px] flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-gradient-end))' }}
                >
                  <HiOutlineEnvelope className="w-9 h-9 text-white" />
                </motion.div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Reset Password</h2>
                <p className="text-[var(--text-secondary)] text-[14px]">Enter your email and we&apos;ll send you a reset link</p>
              </div>

              <form onSubmit={handleReset} className="space-y-5">
                <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Email</label>
                  <div className="relative group">
                    <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                    <input
                      type="email" value={email} onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="name@example.com" required autoComplete="email"
                      className={`w-full pl-11 pr-4 py-3.5 bg-[var(--bg-input)] border rounded-[12px] text-[var(--text-primary)] text-[15px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow-strong)] focus:border-[var(--border-accent)] transition-all duration-200 ${
                        fieldError ? 'border-[var(--danger)]' : 'border-[var(--border-primary)]'
                      }`}
                    />
                  </div>
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
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
