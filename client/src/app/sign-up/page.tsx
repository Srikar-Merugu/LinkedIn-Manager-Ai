'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { SignInForm } from '@/components/auth/SignInForm';
import { useAuth } from '@/contexts/AuthContext';

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [showCreated, setShowCreated] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Check for signup=success query param — show banner for 5s only when present
  useEffect(() => {
    const signupSuccess = searchParams.get('signup') === 'success';
    if (signupSuccess) {
      setMode('signin');
      setShowCreated(true);

      const timer = setTimeout(() => {
        setShowCreated(false);
        // Remove query param without page reload
        const url = new URL(window.location.href);
        url.searchParams.delete('signup');
        window.history.replaceState({}, '', url.toString());
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthLayout mode={mode}>
      <AnimatePresence mode="wait">
        {mode === 'signup' ? (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <SignUpForm onSwitchToSignIn={() => setMode('signin')} />
          </motion.div>
        ) : (
          <motion.div
            key="signin"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <SignInForm onSwitchToSignUp={() => setMode('signup')} showCreated={showCreated} />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}
