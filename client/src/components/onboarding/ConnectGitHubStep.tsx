'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Loader2, CheckCircle2, AlertCircle, Search, Code, Star, GitFork } from 'lucide-react';

interface ConnectGitHubStepProps {
  onComplete: (data: { username: string; publicRepos: number; topLanguages: Array<{ name: string; percentage: number }> }) => void;
  onSkip: () => void;
}

export function ConnectGitHubStep({ onComplete, onSkip }: ConnectGitHubStepProps) {
  const [username, setUsername] = useState('');
  const [state, setState] = useState<'idle' | 'searching' | 'found' | 'complete' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!username.trim()) { setError('Enter a GitHub username'); return; }
    setState('searching');
    setError('');
    await new Promise(r => setTimeout(r, 2000));
    setState('found');
    await new Promise(r => setTimeout(r, 1000));
    onComplete({
      username: username.trim(),
      publicRepos: 24,
      topLanguages: [
        { name: 'TypeScript', percentage: 45 },
        { name: 'Python', percentage: 30 },
        { name: 'JavaScript', percentage: 15 },
        { name: 'Go', percentage: 10 },
      ],
    });
  };

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 shadow-lg mb-4">
          <Github className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Connect GitHub</h2>
        <p className="text-surface-400">Showcase your code, projects, and technical skills.</p>
      </motion.div>

      <div className="glass rounded-2xl p-6 mb-6">
        <label className="block text-sm font-medium text-surface-300 mb-2">GitHub Username</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. octocat"
              disabled={state === 'searching' || state === 'found'}
              className="input pl-10"
            />
          </div>
          <button onClick={handleSearch} disabled={state === 'searching' || state === 'found'} className="btn-primary px-6 gap-2">
            {state === 'searching' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {state === 'searching' ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {state === 'found' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-6 mb-6 space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-accent-400" />
              <span className="text-accent-400 font-medium">Profile found</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Code className="w-4 h-4 text-brand-400" />
                <span className="text-surface-300">24 public repos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-surface-300">128 stars</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <GitFork className="w-4 h-4 text-surface-400" />
                <span className="text-surface-300">42 forks</span>
              </div>
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
        <button onClick={handleSearch} disabled={state === 'searching' || state === 'found'} className="btn-primary flex-1 py-3 gap-2">
          <Github className="w-5 h-5" /> Connect GitHub
        </button>
        <button onClick={onSkip} className="btn-ghost px-6 py-3">Skip</button>
      </div>
      <p className="text-xs text-surface-500 text-center mt-4">
        Only public repository data is collected.
      </p>
    </div>
  );
}
