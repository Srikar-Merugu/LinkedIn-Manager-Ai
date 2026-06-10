'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Loader2, CheckCircle2, AlertCircle,
  User, Mail, Lock, ShieldCheck, Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/* ─── Floating Label Input ───────────────────────────────────────────── */
interface FloatingInputProps {
  id: string;
  type?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  success?: boolean;
  icon: React.ElementType;
  autoComplete?: string;
  suffix?: React.ReactNode;
  onKeyDown?: React.KeyboardEventHandler;
}

function FloatingInput({
  id, type = 'text', label, value, onChange, error, success, icon: Icon, autoComplete, suffix, onKeyDown
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  const borderColor = error
    ? 'border-red-500/60 focus-within:border-red-500'
    : success
    ? 'border-emerald-500/60'
    : focused
    ? 'border-brand-500/60'
    : 'border-white/[0.08]';

  return (
    <div className="space-y-1.5">
      <div
        className={`relative rounded-xl border transition-all duration-300 ${borderColor}`}
        style={{
          background: focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
          boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.12)'}` : 'none',
        }}
      >
        <label
          htmlFor={id}
          className={`absolute left-11 transition-all duration-200 pointer-events-none font-medium ${
            lifted
              ? 'top-1.5 text-[10px] text-white/40'
              : 'top-1/2 -translate-y-1/2 text-sm text-white/30'
          }`}
        >
          {label}
        </label>

        <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
          <Icon className={`w-4 h-4 transition-colors duration-200 ${focused ? 'text-brand-400' : 'text-white/20'}`} />
        </div>

        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          autoComplete={autoComplete}
          className="w-full bg-transparent pt-6 pb-2 pl-11 pr-10 text-sm text-white/90 outline-none rounded-xl"
        />

        {suffix && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 text-xs text-red-400 overflow-hidden"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Password Strength Indicator ───────────────────────────────────── */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500' };
  return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5 overflow-hidden">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${i <= score ? color : ''}`}
              initial={{ width: '0%' }}
              animate={{ width: i <= score ? '100%' : '0%' }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            />
          </div>
        ))}
      </div>
      <p className={`text-xs ${score <= 1 ? 'text-red-400' : score === 2 ? 'text-amber-400' : score === 3 ? 'text-blue-400' : 'text-emerald-400'}`}>
        {label} password
      </p>
    </motion.div>
  );
}

/* ─── Sign Up Form ───────────────────────────────────────────────────── */
interface SignUpFormProps {
  onSwitchToSignIn: () => void;
}

export function SignUpForm({ onSwitchToSignIn, showSuccess }: SignUpFormProps & { showSuccess?: boolean }) {
  const { signUpWithEmailPassword } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = 'Name must be at least 2 characters';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password || password.length < 8) e.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  }, [fullName, email, password, confirmPassword]);

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setErrors({});
    try {
      await signUpWithEmailPassword(email, password, fullName);
      setSuccess(true);
      setTimeout(() => onSwitchToSignIn(), 1500);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to create account' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-5"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white/90">Account created!</h3>
          <p className="text-sm text-white/40 mt-1">Redirecting to sign in...</p>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5 }}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="signup-form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/[0.07] bg-white/[0.03] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-[11px] text-white/40 font-medium tracking-wide">AI-Powered Personal Branding OS</span>
        </div>
        <h2 className="text-[28px] font-bold text-white/95 tracking-tight leading-tight">
          Welcome to PersonaOS
        </h2>
        <p className="text-sm text-white/40 leading-relaxed">
          Create your AI Personal Brand Manager and start building opportunities with AI.
        </p>
      </div>

      <div className="space-y-3.5">
        <FloatingInput
          id="signup-name"
          label="Full Name"
          value={fullName}
          onChange={v => { setFullName(v); setErrors(e => ({ ...e, fullName: '' })); }}
          error={errors.fullName}
          success={fullName.trim().length > 1 && !errors.fullName}
          icon={User}
          autoComplete="name"
        />

        <FloatingInput
          id="signup-email"
          type="email"
          label="Email Address"
          value={email}
          onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: '' })); }}
          error={errors.email}
          success={email.includes('@') && email.includes('.') && !errors.email}
          icon={Mail}
          autoComplete="email"
        />

        <div className="space-y-2">
          <FloatingInput
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            value={password}
            onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: '' })); }}
            error={errors.password}
            icon={Lock}
            autoComplete="new-password"
            suffix={
              <button type="button" onClick={() => setShowPassword(s => !s)} className="text-white/20 hover:text-white/50 transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <PasswordStrengthBar password={password} />
        </div>

        <FloatingInput
          id="signup-confirm"
          type={showConfirm ? 'text' : 'password'}
          label="Confirm Password"
          value={confirmPassword}
          onChange={v => { setConfirmPassword(v); setErrors(e => ({ ...e, confirmPassword: '' })); }}
          error={errors.confirmPassword}
          success={confirmPassword.length > 0 && confirmPassword === password}
          icon={ShieldCheck}
          autoComplete="new-password"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          suffix={
            <button type="button" onClick={() => setShowConfirm(s => !s)} className="text-white/20 hover:text-white/50 transition-colors">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
      </div>

      <AnimatePresence>
        {errors.submit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errors.submit}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        id="create-account-btn"
        onClick={handleSubmit}
        disabled={loading}
        className="relative w-full group overflow-hidden rounded-xl py-3.5 font-semibold text-sm text-white transition-all duration-300 disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(99,102,241,0.55)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(99,102,241,0.35)'; }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        <span className="relative flex items-center justify-center gap-2">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</>
          ) : (
            <><Sparkles className="w-4 h-4" />Create Account</>
          )}
        </span>
      </button>

      <p className="text-center text-sm text-white/35">
        Already have an account?{' '}
        <button
          id="switch-to-signin-btn"
          onClick={onSwitchToSignIn}
          className="relative text-brand-400 hover:text-brand-300 font-medium transition-colors group"
        >
          Sign In
          <span className="absolute bottom-0 left-0 w-0 h-px bg-brand-400 group-hover:w-full transition-all duration-300" />
        </button>
      </p>
    </motion.div>
  );
}
