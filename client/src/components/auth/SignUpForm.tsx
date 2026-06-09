'use client';

import { useState } from 'react';
import { useSignUp } from '@clerk/nextjs/legacy';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { GoogleButton } from './GoogleButton';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special character', pass: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const strength = checks.filter((c) => c.pass).length;
  const width = `${(strength / checks.length) * 100}%`;
  const color =
    strength === 0 ? 'bg-white/10' :
    strength <= 2 ? 'bg-red-500/50' :
    strength === 3 ? 'bg-amber-500/50' :
    'bg-accent-500/50';

  return (
    <div className="space-y-2 mt-2">
      <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-1.5">
            {check.pass ? (
              <Check className="w-2.5 h-2.5 text-accent-400" />
            ) : (
              <X className="w-2.5 h-2.5 text-white/20" />
            )}
            <span className={`text-[10px] ${check.pass ? 'text-white/50' : 'text-white/20'}`}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SignUpForm() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'create' | 'verify'>('create');

  if (isSignedIn) {
    router.push('/onboarding');
    return null;
  }

  const handleGoogleSignUp = async () => {
    if (!signUp) return;
    setIsLoading(true);
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/onboarding',
      });
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Google sign-up failed');
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      if (result.status === 'missing_requirements') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setStep('verify');
      } else if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/onboarding');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/onboarding');
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = email.trim() && password.length >= 8;

  if (step === 'verify') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-5 h-5 text-brand-400" />
          </div>
          <h3 className="text-lg font-semibold text-white/90">Check your email</h3>
          <p className="text-sm text-white/40 mt-1">
            We sent a verification code to {email}
          </p>
        </div>

        <form onSubmit={handleVerification} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter code"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/40 text-center tracking-[0.5em] font-mono
                bg-white/[0.06] border border-white/[0.08]
                focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.08]
                transition-all duration-300"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
            />
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
            disabled={code.length < 6 || isLoading}
            className="relative w-full py-3 rounded-xl font-medium text-sm overflow-hidden group"
            whileHover={code.length === 6 && !isLoading ? { scale: 1.01 } : {}}
            whileTap={code.length === 6 && !isLoading ? { scale: 0.99 } : {}}
            style={{
              background: code.length === 6 && !isLoading
                ? 'linear-gradient(135deg, #6366f1, #3b82f6, #06b6d4)'
                : 'rgba(255,255,255,0.04)',
              opacity: code.length === 6 && !isLoading ? 1 : 0.5,
              cursor: code.length === 6 && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-white">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Verify Email
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </span>
          </motion.button>
        </form>

        <button
          type="button"
          onClick={() => setStep('create')}
          className="w-full text-center text-sm text-white/30 hover:text-white/50 transition-colors"
        >
          Back to sign up
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <GoogleButton onClick={handleGoogleSignUp} isLoading={isLoading} />

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-xs text-white/30 font-medium tracking-wide">or continue with email</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      <form onSubmit={handleEmailSignUp} className="space-y-4">
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

        <div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Lock className="w-4 h-4 text-white/30" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="w-full pl-10 pr-12 py-3 rounded-xl text-sm text-white placeholder-white/40
                bg-white/[0.06] border border-white/[0.08]
                focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.08]
                transition-all duration-300"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-white/30 hover:text-white/50 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
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
          <span className="relative z-10 flex items-center justify-center gap-2 text-white">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Create Account
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
  );
}
