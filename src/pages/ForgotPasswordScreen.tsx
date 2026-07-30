import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { HiOutlineEnvelope } from 'react-icons/hi2';
import { resetPassword } from '@/services/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError('');
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

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center px-4 py-8 relative overflow-hidden" style={{ background: '#050505' }}>
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12), transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute bottom-[-10%] right-[-5%] w-[350px] h-[350px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.1), transparent 70%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px] relative z-10"
      >
        {/* Neon glass card */}
        <div className="neon-glass rounded-[28px] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />

          {sent ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                className="w-[72px] h-[72px] rounded-[20px] bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-5 border border-[var(--success)]/20"
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
              <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 text-[var(--accent-secondary)] hover:text-[var(--accent-tertiary)] font-medium text-[14px] transition-colors">
                Back to Sign In
              </button>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.15))',
                    border: '1px solid rgba(124,58,237,0.2)',
                  }}
                >
                  <HiOutlineEnvelope className="w-7 h-7 text-[var(--accent-primary)]" />
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
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com" required
                      className="w-full pl-11 pr-4 py-3.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-primary)] text-[15px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/40 focus:bg-[var(--bg-input-focus)] transition-all duration-200"
                    />
                  </div>
                </motion.div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[14px] px-4 py-3">
                    <p className="text-[var(--danger)] text-[13px] text-center">{error}</p>
                  </motion.div>
                )}

                <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
                  className="neon-btn w-full">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Send Reset Link'}
                </motion.button>

                <div className="text-center">
                  <button type="button" onClick={() => navigate('/login')} className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-[14px] transition-colors">
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
