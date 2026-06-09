'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface ConnectLinkedInProps {
  onConnected?: (data: { accessToken: string; linkedinId: string }) => void;
  className?: string;
}

export function ConnectLinkedIn({ onConnected, className }: ConnectLinkedInProps) {
  const [state, setState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  const handleConnect = async () => {
    setState('connecting');
    try {
      const { url } = await api.auth.getLinkedInUrl();
      window.location.href = url;
    } catch (err) {
      setState('error');
      setError('Failed to initiate LinkedIn connection');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  if (state === 'connected') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl',
          'bg-accent-500/10 border border-accent-500/20',
          className
        )}
      >
        <CheckCircle2 className="w-5 h-5 text-accent-400" />
        <div>
          <p className="text-sm font-medium text-accent-400">LinkedIn Connected</p>
          <p className="text-xs text-surface-500">Your profile is being analyzed</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {state === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      <button
        onClick={handleConnect}
        disabled={state === 'connecting'}
        className="btn-primary w-full gap-3 py-3"
      >
        {state === 'connecting' ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Linkedin className="w-5 h-5" />
            Connect LinkedIn
          </>
        )}
      </button>

      <p className="text-xs text-surface-500 text-center">
        Your data is encrypted and secure. We never post without your permission.
      </p>
    </div>
  );
}
