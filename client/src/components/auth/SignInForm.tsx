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
import { Sparkles, Shield, CheckCircle2, Lock } from 'lucide-react';

const trusts = [
  { icon: Shield,       text: 'Enterprise Grade Security' },
  { icon: CheckCircle2, text: 'SOC 2 Ready' },
  { icon: Lock,         text: 'Encrypted Data' },
  { icon: Sparkles,     text: 'Powered by Clerk' },
];

interface SignInFormProps {
  onSwitchToSignUp?: () => void;
}

export function SignInForm({ onSwitchToSignUp }: SignInFormProps) {
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
          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/[0.07] bg-white/[0.03] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-[11px] text-white/40 font-medium tracking-wide">AI-Powered Personal Branding OS</span>
            </div>
            <h2 className="text-[28px] font-bold text-white/95 tracking-tight">Welcome to PersonaOS</h2>
            <p className="text-sm text-white/40 leading-relaxed">
              Connect your professional identity to unlock your AI growth system.
            </p>
          </div>

          {/* LinkedIn — Primary CTA */}
          <LinkedInButton
            onClick={() => handleOAuth('oauth_linkedin')}
            isLoading={isLoading === 'oauth_linkedin'}
          />

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            <span className="text-xs text-white/25 font-medium tracking-wider uppercase">Or continue with</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          </div>

          {/* Secondary social buttons */}
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

          {/* More options */}
          <button
            id="more-sign-in-options-btn"
            onClick={() => setShowEmailAuth(true)}
            className="w-full text-center text-xs text-white/25 hover:text-white/45 transition-colors py-1"
          >
            <span className="border-b border-dotted border-white/15 hover:border-white/35 transition-colors pb-px">
              More sign in options
            </span>
          </button>

          {/* Already have account */}
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

          {/* Trust Section */}
          <div className="pt-4 border-t border-white/[0.05]">
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
              {trusts.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-white/20" />
                  <span className="text-[10px] text-white/20">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
