'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { LinkedInButton } from './LinkedInButton';
import { GoogleButton } from './GoogleButton';
import { GitHubButton } from './GitHubButton';
import { EmailAuthForm } from './EmailAuthForm';
import { AuthLoadingSequence } from './AuthLoadingSequence';

const benefits = [
  'Analyze LinkedIn Profile',
  'Build Brand DNA',
  'Create Content Strategy',
  'Generate Content Calendar',
  'Discover Opportunities',
  'AI Personal Brand Manager',
];

const trusts = [
  'Enterprise Grade Security',
  'Powered by Clerk Authentication',
  'SOC 2 Compliant',
  'Encrypted Data',
];

export function SignInForm() {
  const searchParams = useSearchParams();
  const { loginWithOAuth, showEmailAuth, setShowEmailAuth } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState(false);

  if (searchParams.get('success') === 'true' || showLoading) {
    return <AuthLoadingSequence onComplete={() => window.location.href = '/onboarding'} />;
  }

  const handleOAuth = async (strategy: 'oauth_linkedin' | 'oauth_google' | 'oauth_github') => {
    setIsLoading(strategy);
    try {
      await loginWithOAuth(strategy);
    } catch {
      setIsLoading(null);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {showEmailAuth ? (
        <motion.div
          key="email-auth"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <EmailAuthForm onBack={() => setShowEmailAuth(false)} />
        </motion.div>
      ) : (
        <motion.div
          key="oauth-buttons"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="space-y-5"
        >
          <LinkedInButton
            onClick={() => handleOAuth('oauth_linkedin')}
            isLoading={isLoading === 'oauth_linkedin'}
          />

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-white/30 font-medium tracking-wide">or continue with</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="space-y-3">
            <GoogleButton
              onClick={() => handleOAuth('oauth_google')}
              isLoading={isLoading === 'oauth_google'}
            />
            <GitHubButton
              onClick={() => handleOAuth('oauth_github')}
              isLoading={isLoading === 'oauth_github'}
            />
          </div>

          <div className="relative">
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <button
            onClick={() => setShowEmailAuth(true)}
            className="w-full text-center text-sm text-white/30 hover:text-white/50 transition-colors py-2"
          >
            <span className="border-b border-dotted border-white/20 hover:border-white/40">
              More sign in options
            </span>
          </button>

          <div className="pt-2 space-y-1.5">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-white/30 text-xs">
                <svg className="w-3.5 h-3.5 text-accent-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/[0.06]">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {trusts.map((trust) => (
                <div key={trust} className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-[10px] text-white/20">{trust}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
