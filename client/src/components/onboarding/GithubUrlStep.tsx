'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Loader2, AlertCircle, Link as LinkIcon } from 'lucide-react';

interface GithubUrlStepProps {
  onComplete: (data: { githubUrl: string }) => void;
  onSkip: () => void;
}

export function GithubUrlStep({ onComplete, onSkip }: GithubUrlStepProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateUrl = (value: string): boolean => {
    return /github\.com\/[a-zA-Z0-9_-]+/.test(value);
  };

  const handleContinue = async () => {
    setError('');
    if (!url.trim()) {
      onSkip();
      return;
    }
    if (!validateUrl(url)) {
      setError('Please enter a valid GitHub profile URL (e.g., https://github.com/yourname)');
      return;
    }
    setLoading(true);
    onComplete({ githubUrl: url.trim() });
  };

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg mb-4">
          <Github className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Your GitHub Profile</h2>
        <p className="text-surface-400">Show your open source work and technical projects.</p>
      </motion.div>

      <div className="glass rounded-2xl p-6 mb-6">
        <label className="block text-sm font-medium text-surface-300 mb-2">GitHub Profile URL</label>
        <div className="relative">
          <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="https://github.com/yourname"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-10 py-3.5 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
          />
        </div>
        {error && (
          <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleContinue}
          disabled={loading}
          className="btn-primary flex-1 py-3 gap-2"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
          ) : (
            <>Continue</>
          )}
        </button>
        <button onClick={onSkip} className="btn-ghost px-6 py-3">Skip</button>
      </div>
      <p className="text-xs text-surface-500 text-center mt-4">
        This step is optional. Skip if you don't have a GitHub profile.
      </p>
    </div>
  );
}
