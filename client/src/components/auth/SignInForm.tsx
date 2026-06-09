'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs/legacy';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { GoogleButton } from './GoogleButton';

export function SignInForm() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isSignedIn) {
    router.push('/onboarding');
    return null;
  }

  const handleGoogleSignIn = async () => {
    if (!signIn) return;
    setIsLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/onboarding',
      });
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Google sign-in failed');
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/onboarding');
      } else {
        setError('Please complete all required steps.');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = email.trim() && password.length >= 8;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <GoogleButton onClick={handleGoogleSignIn} isLoading={isLoading} />

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-xs text-white/30 font-medium tracking-wide">or continue with email</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Mail className="w-4 h-4 text-white/30" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/40
                bg-white/[0.06] border border-white/[0.08]
                focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.08]
                transition-all duration-300"
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Lock className="w-4 h-4 text-white/30" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-10 pr-12 py-3 rounded-xl text-sm text-white placeholder-white/40
                bg-white/[0.06] border border-white/[0.08]
                focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.08]
                transition-all duration-300"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-white/30 hover:text-white/50 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-400 text-xs"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="relative w-full py-3 rounded-xl font-medium text-sm overflow-hidden group"
            whileHover={isFormValid && !isLoading ? { scale: 1.01 } : {}}
            whileTap={isFormValid && !isLoading ? { scale: 0.99 } : {}}
            style={{
              background: isFormValid && !isLoading
                ? 'linear-gradient(135deg, #6366f1, #3b82f6, #06b6d4)'
                : 'rgba(255,255,255,0.04)',
              opacity: isFormValid && !isLoading ? 1 : 0.5,
              cursor: isFormValid && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #2563eb, #0891b2)',
                filter: 'blur(20px)',
              }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2 text-white">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </span>
          </motion.button>
        </form>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <svg className="w-3.5 h-3.5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Secure Authentication</span>
          </div>
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <svg className="w-3.5 h-3.5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Enterprise Grade Security</span>
          </div>
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <svg className="w-3.5 h-3.5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Your data remains private</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
