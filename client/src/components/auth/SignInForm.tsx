'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Loader2, AlertCircle,
  Mail, Lock, Sparkles, CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SignInFormProps {
  onSwitchToSignUp?: () => void;
  showCreated?: boolean;
}

export function SignInForm({ onSwitchToSignUp, showCreated }: SignInFormProps) {
  const { loginWithEmailPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await loginWithEmailPassword(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="signin-form"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/[0.07] bg-white/[0.03] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-[11px] text-white/40 font-medium tracking-wide">AI-Powered Personal Branding OS</span>
        </div>
        <h2 className="text-[28px] font-bold text-white/95 tracking-tight">
          Welcome Back
        </h2>
        <p className="text-sm text-white/40 leading-relaxed">
          Sign in to continue building your AI-powered personal brand.
        </p>
      </div>

      {showCreated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Account created successfully! Please sign in to continue.
        </motion.div>
      )}

      <div className="space-y-3.5">
        <div>
          <label className="block text-xs text-white/40 font-medium mb-1.5 ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder="you@example.com"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-10 py-3.5 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/40 font-medium mb-1.5 ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              placeholder="Enter your password"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-10 py-3.5 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        id="sign-in-btn"
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
            <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</>
          ) : (
            <><Sparkles className="w-4 h-4" />Sign In</>
          )}
        </span>
      </button>

      <p className="text-center text-sm text-white/35">
        Don&apos;t have an account?{' '}
        <button
          id="switch-to-signup-btn"
          onClick={onSwitchToSignUp}
          className="relative text-brand-400 hover:text-brand-300 font-medium transition-colors group"
        >
          Create account
          <span className="absolute bottom-0 left-0 w-0 h-px bg-brand-400 group-hover:w-full transition-all duration-300" />
        </button>
      </p>
    </motion.div>
  );
}
