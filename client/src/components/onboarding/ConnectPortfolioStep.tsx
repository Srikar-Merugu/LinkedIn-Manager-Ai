'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Loader2, CheckCircle2, AlertCircle, ExternalLink, FileText, BookOpen, Briefcase } from 'lucide-react';

interface ConnectPortfolioStepProps {
  onComplete: (data: { url: string; entries: number }) => void;
  onSkip: () => void;
}

export function ConnectPortfolioStep({ onComplete, onSkip }: ConnectPortfolioStepProps) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'idle' | 'fetching' | 'complete' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!url.trim()) { setError('Enter a portfolio URL'); return; }
    if (!url.startsWith('http')) { setError('Enter a valid URL (including https://)'); return; }
    setState('fetching');
    setError('');
    await new Promise(r => setTimeout(r, 2500));
    onComplete({ url: url.trim(), entries: 6 });
  };

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg mb-4">
          <Globe className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Connect Portfolio</h2>
        <p className="text-surface-400">Link your personal website or portfolio to showcase your work.</p>
      </motion.div>

      <div className="glass rounded-2xl p-6 mb-6">
        <label className="block text-sm font-medium text-surface-300 mb-2">Portfolio URL</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              placeholder="https://yourportfolio.com"
              disabled={state === 'fetching'}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {state === 'fetching' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
              <span className="text-surface-300">Analyzing portfolio content...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </motion.div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={handleConnect} disabled={state === 'fetching'} className="btn-primary flex-1 py-3 gap-2">
          {state === 'fetching' ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Globe className="w-5 h-5" /> Connect Portfolio</>}
        </button>
        <button onClick={onSkip} className="btn-ghost px-6 py-3">Skip</button>
      </div>
    </div>
  );
}
