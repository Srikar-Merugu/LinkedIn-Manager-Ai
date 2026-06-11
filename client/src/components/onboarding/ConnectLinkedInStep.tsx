'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, Loader2, CheckCircle2, AlertCircle, User, Award, BookOpen, Briefcase, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface ConnectLinkedInStepProps {
  onComplete: (data: { profileId: string; accessToken: string }) => void;
  onSkip: () => void;
}

type ConnectionState = 'idle' | 'connecting' | 'authorizing' | 'fetching' | 'connected' | 'error';

export function ConnectLinkedInStep({ onComplete, onSkip }: ConnectLinkedInStepProps) {
  const [state, setState] = useState<ConnectionState>('idle');
  const [error, setError] = useState('');
  const [profileInfo, setProfileInfo] = useState<{ name?: string; headline?: string }>({});

  const handleOAuthReturn = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const linkedinStatus = params.get('linkedin');

    if (!linkedinStatus) return;

    window.history.replaceState({}, '', '/onboarding');

    if (linkedinStatus === 'connected') {
      setState('fetching');
      try {
        const profileData = await api.profile.getByUser().catch(() => null);
        if (profileData) {
          setProfileInfo({
            name: [profileData.firstName, profileData.lastName].filter(Boolean).join(' ') || undefined,
            headline: profileData.headline || undefined,
          });
        }
      } catch {}

      setState('connected');
      const profileId = params.get('profileId') || '';
      onComplete({ profileId, accessToken: '' });
    } else if (linkedinStatus === 'error') {
      const reason = params.get('reason') || 'unknown';
      setError(getErrorMessage(reason));
      setState('error');
    }
  }, [onComplete]);

  useEffect(() => {
    handleOAuthReturn();
  }, [handleOAuthReturn]);

  const handleConnect = async () => {
    setState('connecting');
    setError('');

    try {
      const { url } = await api.auth.getLinkedInUrl();
      setState('authorizing');
      window.location.href = url;
    } catch (err: any) {
      setState('error');
      setError(err.message || 'Failed to initiate LinkedIn connection');
    }
  };

  const handleRetry = () => {
    setState('idle');
    setError('');
  };

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg mb-4">
          <Linkedin className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Connect LinkedIn</h2>
        <p className="text-surface-400">Make your LinkedIn profile the source of truth for your brand analysis.</p>
      </motion.div>

      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-surface-300 mb-3 uppercase tracking-wider">What we collect</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Headline & About', icon: User },
            { label: 'Work Experience', icon: Briefcase },
            { label: 'Skills & Endorsements', icon: Award },
            { label: 'Education', icon: BookOpen },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
              <item.icon className="w-4 h-4 text-brand-400" />
              <span className="text-sm text-surface-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state === 'authorizing' && (
          <motion.div
            key="authorizing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl p-6 mb-6 overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <div>
                <p className="text-sm font-medium text-surface-200">Redirecting to LinkedIn...</p>
                <p className="text-xs text-surface-500">Complete authorization in the LinkedIn popup</p>
              </div>
            </div>
          </motion.div>
        )}

        {state === 'fetching' && (
          <motion.div
            key="fetching"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl p-6 mb-6 overflow-hidden"
          >
            <div className="space-y-3">
              {[
                { label: 'Fetching profile data', icon: User },
                { label: 'Syncing experience', icon: Briefcase },
                { label: 'Importing skills', icon: Award },
                { label: 'Loading education', icon: BookOpen },
              ].map((step, i) => (
                <div
                  key={step.label}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm bg-brand-500/10 text-brand-400"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <step.icon className="w-3.5 h-3.5" />
                  {step.label}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {state === 'connected' && (
          <motion.div
            key="connected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 mb-6 border border-accent-500/20"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-accent-400" />
              <div>
                <p className="text-sm font-medium text-accent-400">LinkedIn Connected</p>
                {profileInfo.name && (
                  <p className="text-xs text-surface-400">{profileInfo.name}</p>
                )}
                {profileInfo.headline && (
                  <p className="text-xs text-surface-500 truncate max-w-[250px]">{profileInfo.headline}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 mb-6 bg-red-500/10 border border-red-500/20"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">LinkedIn connection failed</p>
                <p className="text-xs text-red-400/70 mt-1">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        {state === 'error' ? (
          <button
            onClick={handleRetry}
            className="btn-primary flex-1 py-3 gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        ) : state === 'connected' ? (
          <button
            onClick={() => onComplete({ profileId: '', accessToken: '' })}
            className="btn-primary flex-1 py-3 gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Continue
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={state !== 'idle'}
            className="btn-primary flex-1 py-3 gap-2"
          >
            {state === 'connecting' || state === 'authorizing' || state === 'fetching' ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {state === 'authorizing' ? 'Authorizing...' : 'Connecting...'}</>
            ) : (
              <><Linkedin className="w-5 h-5" /> Connect LinkedIn</>
            )}
          </button>
        )}
        {state !== 'connected' && state !== 'fetching' && (
          <button onClick={onSkip} className="btn-ghost px-6 py-3">Skip</button>
        )}
      </div>
      <p className="text-xs text-surface-500 text-center mt-4">
        Your data is encrypted. We never post without your permission.
      </p>
    </div>
  );
}

function getErrorMessage(reason: string): string {
  const messages: Record<string, string> = {
    access_denied: 'You denied LinkedIn access. Please try again.',
    token_exchange_failed: 'Failed to exchange authorization code. Please try again.',
    profile_fetch_failed: 'Failed to fetch your LinkedIn profile. Please try again.',
    user_not_found: 'User session expired. Please sign in again.',
    invalid_state: 'Invalid authorization state. Please try again.',
    missing_parameters: 'Missing authorization parameters. Please try again.',
    internal_error: 'An internal error occurred. Please try again.',
  };
  return messages[reason] || `LinkedIn connection failed (${reason}). Please try again.`;
}
