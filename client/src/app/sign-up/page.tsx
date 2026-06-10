'use client';

import { Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { SignInForm } from '@/components/auth/SignInForm';

function AuthContent() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

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
            <SignInForm onSwitchToSignUp={() => setMode('signup')} />
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
