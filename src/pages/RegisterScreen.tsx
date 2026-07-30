import { useState, useCallback, type FormEvent, type FocusEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineUser, HiOutlineCheckCircle } from 'react-icons/hi2';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import AuthLayout from '@/components/AuthLayout';
import { registerWithEmail } from '@/services/auth';

interface FieldErrors {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_ERRORS: FieldErrors = { displayName: '', email: '', password: '', confirmPassword: '' };

function validateEmail(email: string): string {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return '';
}

function validateDisplayName(name: string): string {
  if (!name.trim()) return 'Full name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  return '';
}

function validatePassword(pw: string): string {
  if (!pw) return 'Password is required';
  if (pw.length < 6) return 'Password must be at least 6 characters';
  return '';
}

function validateConfirmPassword(pw: string, confirm: string): string {
  if (!confirm) return 'Please confirm your password';
  if (pw !== confirm) return 'Passwords do not match';
  return '';
}

function passwordStrength(pw: string): { label: string; color: string; width: string } {
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

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>(EMPTY_ERRORS);
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const validateField = useCallback((field: keyof FieldErrors, value: string): string => {
    switch (field) {
      case 'displayName': return validateDisplayName(value);
      case 'email': return validateEmail(value);
      case 'password': return validatePassword(value);
      case 'confirmPassword': return validateConfirmPassword(password, value);
      default: return '';
    }
  }, [password]);

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    const field = e.target.name as keyof FieldErrors;
    const value = e.target.value;
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  }

  function handleChange(field: keyof FieldErrors, value: string) {
    if (field === 'displayName') setDisplayName(value);
    else if (field === 'email') setEmail(value);
    else if (field === 'password') setPassword(value);
    else if (field === 'confirmPassword') setConfirmPassword(value);

    if (touched[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev, [field]: validateField(field, value) };
        if (field === 'password' && touched.confirmPassword) {
          newErrors.confirmPassword = validateConfirmPassword(value, confirmPassword);
        }
        return newErrors;
      });
    }
  }

  function validateAll(): boolean {
    const newErrors: FieldErrors = {
      displayName: validateDisplayName(displayName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };
    setErrors(newErrors);
    setTouched({ displayName: true, email: true, password: true, confirmPassword: true });
    return !Object.values(newErrors).some((e) => e !== '');
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setGlobalError('');
    if (!validateAll()) return;
    setLoading(true);
    try {
      await registerWithEmail(email.trim(), password, displayName.trim());
      setSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setGlobalError(message);
    } finally {
      setLoading(false);
    }
  }

  const strength = passwordStrength(password);

  const inputClass = (field: keyof FieldErrors) =>
    `w-full pl-11 pr-4 py-3.5 bg-[var(--bg-input)] border rounded-[16px] text-[var(--text-primary)] text-[15px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/40 focus:bg-[var(--bg-input-focus)] transition-all duration-200 ${
      touched[field] && errors[field] ? 'border-[var(--danger)]' : 'border-[var(--border-primary)]'
    }`;

  return (
    <AuthLayout mode="register" onToggle={() => {}}>
      <AnimatePresence mode="wait">
        {success ? (
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
              className="w-[80px] h-[80px] rounded-[22px] bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-5"
            >
              <HiOutlineCheckCircle className="w-10 h-10 text-[var(--success)]" />
            </motion.div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Account Created!</h3>
            <p className="text-[var(--text-secondary)] text-[14px]">Redirecting you to the app...</p>
            <div className="mt-5 flex justify-center">
              <div className="w-5 h-5 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={handleRegister} className="space-y-4">
            {/* Display Name */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Full Name</label>
              <div className="relative group">
                <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                <input
                  type="text" name="displayName" value={displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="John Appleseed" autoComplete="name"
                  className={inputClass('displayName')}
                />
              </div>
              <AnimatePresence>
                {touched.displayName && errors.displayName && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="text-[var(--danger)] text-[12px] mt-1.5 ml-1">{errors.displayName}</motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Email */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Email</label>
              <div className="relative group">
                <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                <input
                  type="email" name="email" value={email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="name@example.com" autoComplete="email"
                  className={inputClass('email')}
                />
              </div>
              <AnimatePresence>
                {touched.email && errors.email && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="text-[var(--danger)] text-[12px] mt-1.5 ml-1">{errors.email}</motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Password */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Password</label>
              <div className="relative group">
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password" value={password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Min. 6 characters" autoComplete="new-password"
                  className={`${inputClass('password')} !pr-12`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-0.5">
                  {showPassword ? <AiOutlineEyeInvisible className="w-[18px] h-[18px]" /> : <AiOutlineEye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2.5 ml-1">
                  <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: strength.width }}
                      className="h-full rounded-full" style={{ backgroundColor: strength.color }} />
                  </div>
                  <p className="text-[11px] mt-1 font-medium" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
              <AnimatePresence>
                {touched.password && errors.password && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="text-[var(--danger)] text-[12px] mt-1 ml-1">{errors.password}</motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Confirm Password */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 }}>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Confirm Password</label>
              <div className="relative group">
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword" value={confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Repeat your password" autoComplete="new-password"
                  className={inputClass('confirmPassword')}
                />
                {confirmPassword && !errors.confirmPassword && confirmPassword === password && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--success)] animate-bounce-in">
                    <HiOutlineCheckCircle className="w-[18px] h-[18px]" />
                  </span>
                )}
              </div>
              <AnimatePresence>
                {touched.confirmPassword && errors.confirmPassword && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="text-[var(--danger)] text-[12px] mt-1.5 ml-1">{errors.confirmPassword}</motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Global Error */}
            <AnimatePresence>
              {globalError && (
                <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  className="bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[14px] px-4 py-3">
                  <p className="text-[var(--danger)] text-[13px] text-center">{globalError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
              className="btn-primary w-full">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </motion.button>

            <p className="text-center text-[var(--text-secondary)] text-[14px] mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--accent-secondary)] hover:text-[var(--accent-tertiary)] font-semibold transition-colors">Sign In</Link>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
