'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, Loader2, CheckCircle2, AlertCircle, User, Award, BookOpen, Briefcase, Sparkles } from 'lucide-react';

interface ConnectLinkedInStepProps {
  onComplete: (data: { profileId: string; accessToken: string }) => void;
  onSkip: () => void;
}

export function ConnectLinkedInStep({ onComplete, onSkip }: ConnectLinkedInStepProps) {
  const [state, setState] = useState<'idle' | 'connecting' | 'syncing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setState('connecting');
    await new Promise(r => setTimeout(r, 1500));
    setState('syncing');

    const steps = [
      { label: 'Importing profile data', icon: User },
      { label: 'Analyzing experience', icon: Briefcase },
      { label: 'Extracting skills', icon: Award },
      { label: 'Scanning education', icon: BookOpen },
      { label: 'Generating insights', icon: Sparkles },
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      setProgress(((i + 1) / steps.length) * 100);
    }

    await new Promise(r => setTimeout(r, 500));
    onComplete({ profileId: 'simulated-profile-id', accessToken: 'simulated-token' });
  };

  const syncSteps = [
    { label: 'Importing profile data', icon: User },
    { label: 'Analyzing experience', icon: Briefcase },
    { label: 'Extracting skills', icon: Award },
    { label: 'Scanning education', icon: BookOpen },
    { label: 'Generating insights', icon: Sparkles },
  ];

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
        {state === 'syncing' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl p-6 mb-6 overflow-hidden"
          >
            <div className="space-y-3">
              {syncSteps.map((step, i) => {
                const stepProgress = ((i + 1) / syncSteps.length) * 100;
                const isDone = progress >= stepProgress;
                const isActive = progress >= stepProgress - (100 / syncSteps.length) && !isDone;
                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-500 ${
                      isDone ? 'bg-accent-500/10 text-accent-400' : isActive ? 'bg-brand-500/10 text-brand-400' : 'text-surface-500'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-accent-400" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-surface-600" />
                    )}
                    <step.icon className="w-3.5 h-3.5" />
                    {step.label}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 w-full h-1 rounded-full bg-surface-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-brand-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4"
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </motion.div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleConnect}
          disabled={state === 'connecting' || state === 'syncing'}
          className="btn-primary flex-1 py-3 gap-2"
        >
          {state === 'connecting' || state === 'syncing' ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
          ) : (
            <><Linkedin className="w-5 h-5" /> Connect LinkedIn</>
          )}
        </button>
        <button onClick={onSkip} className="btn-ghost px-6 py-3">Skip</button>
      </div>
      <p className="text-xs text-surface-500 text-center mt-4">
        Your data is encrypted. We never post without your permission.
      </p>
    </div>
  );
}
