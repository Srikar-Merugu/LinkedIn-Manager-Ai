'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Key, Loader2, CheckCircle2, Sparkles, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type EmailMode = 'select' | 'password' | 'signup' | 'otp' | 'magic_link' | 'verify_otp' | 'sent' | 'success';

export function EmailAuthForm({ onBack }: { onBack: () => void }) {
  const { loginWithEmailPassword, signUpWithEmailPassword, loginWithEmailOTP, verifyEmailOTP, loginWithMagicLink } = useAuth();
  const [mode, setMode] = useState<EmailMode>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordLogin = async () => {
    if (!email.trim() || !email.includes('@')) {
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
      setMode('success');
    } catch (err: any) {
      if (err.message === 'VERIFY_EMAIL') {
        setMode('signup');
      } else if (err.errors?.[0]?.code === 'form_identifier_not_found') {
        setMode('signup');
      } else {
        setError(err.message || err.errors?.[0]?.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignUp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmailPassword(email, password, fullName);
      setMode('success');
    } catch (err: any) {
      setError(err.message || err.errors?.[0]?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await loginWithEmailOTP(email);
      setMode('verify_otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!code.trim() || code.length < 4) {
      setError('Please enter the full verification code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyEmailOTP(email, code);
      setMode('success');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await loginWithMagicLink(email);
      setMode('sent');
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in options
      </button>

      <AnimatePresence mode="wait">
        {mode === 'select' && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white/90">Sign in with Email</h3>
              <p className="text-sm text-white/40 mt-1">Choose how to authenticate</p>
            </div>

            <button
              onClick={() => { setMode('password'); setError(null); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500/20 to-brand-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Lock className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Email & Password</p>
                <p className="text-xs text-white/40">Sign in with your password</p>
              </div>
            </button>

            <button
              onClick={() => { setMode('otp'); setError(null); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Key className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Email OTP</p>
                <p className="text-xs text-white/40">Receive a one-time code</p>
              </div>
            </button>

            <button
              onClick={() => { setMode('magic_link'); setError(null); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Magic Link</p>
                <p className="text-xs text-white/40">Click a link in your inbox</p>
              </div>
            </button>
          </motion.div>
        )}

        {mode === 'password' && (
          <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/90">Sign in with Password</h3>
              <p className="text-sm text-white/40 mt-1">Enter your email and password</p>
            </div>

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
                autoFocus
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              onClick={handlePasswordLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-sm hover:from-brand-500 hover:to-brand-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <p className="text-center text-xs text-white/30">
              No account?{' '}
              <button onClick={() => { setMode('signup'); setError(null); }} className="text-brand-400 hover:text-brand-300">
                Create one
              </button>
            </p>
          </motion.div>
        )}

        {mode === 'signup' && (
          <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/20 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/90">Create Account</h3>
              <p className="text-sm text-white/40 mt-1">Set up your email and password</p>
            </div>

            <div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(null); }}
                placeholder="Full Name"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
                autoFocus
              />
            </div>

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Password (min 8 characters)"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSignUp()}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              onClick={handlePasswordSignUp}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-sm hover:from-brand-500 hover:to-brand-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <p className="text-center text-xs text-white/30">
              Already have an account?{' '}
              <button onClick={() => { setMode('password'); setError(null); }} className="text-brand-400 hover:text-brand-300">
                Sign in
              </button>
            </p>
          </motion.div>
        )}

        {(mode === 'otp' || mode === 'magic_link') && (
          <motion.div key="email-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white/90">
                {mode === 'otp' ? 'Email OTP' : 'Magic Link'}
              </h3>
              <p className="text-sm text-white/40 mt-1">
                {mode === 'otp'
                  ? 'Enter your email to receive a verification code'
                  : 'Enter your email to receive a magic sign-in link'}
              </p>
            </div>

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              onClick={mode === 'otp' ? handleSendOTP : handleSendMagicLink}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-sm hover:from-brand-500 hover:to-brand-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : mode === 'otp' ? (
                'Send Verification Code'
              ) : (
                'Send Magic Link'
              )}
            </button>
          </motion.div>
        )}

        {mode === 'verify_otp' && (
          <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white/90">Check your email</h3>
              <p className="text-sm text-white/40 mt-1">
                We sent a code to <span className="text-white/60">{email}</span>
              </p>
            </div>

            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(null); }}
                placeholder="Enter verification code"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 text-sm text-center tracking-[0.5em] font-mono focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
                autoFocus
                maxLength={8}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-sm hover:from-brand-500 hover:to-brand-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Sign In'
              )}
            </button>

            <button
              onClick={handleSendOTP}
              className="w-full text-center text-sm text-white/30 hover:text-white/50 transition-colors"
            >
              Resend code
            </button>
          </motion.div>
        )}

        {mode === 'sent' && (
          <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-accent-400" />
            </div>
            <h3 className="text-lg font-semibold text-white/90">Magic link sent!</h3>
            <p className="text-sm text-white/40">
              Check your inbox at <span className="text-white/60">{email}</span>
              <br />and click the sign-in link.
            </p>
            <p className="text-xs text-white/20">
              Didn&apos;t receive it? Check spam or{' '}
              <button onClick={handleSendMagicLink} className="text-brand-400 hover:text-brand-300">
                try again
              </button>
            </p>
          </motion.div>
        )}

        {mode === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-accent-400" />
            </div>
            <h3 className="text-lg font-semibold text-white/90">Signed in!</h3>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5 }}
              />
            </div>
            <p className="text-sm text-white/40">Preparing your experience...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
