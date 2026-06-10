'use client';

import { motion } from 'framer-motion';
import { Loader2, Code2 } from 'lucide-react';

interface GitHubButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export function GitHubButton({ onClick, isLoading }: GitHubButtonProps) {
  return (
    <motion.button
      id="github-auth-btn"
      onClick={onClick}
      disabled={isLoading}
      className="relative w-full group overflow-hidden rounded-xl disabled:opacity-60"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div
        className="relative flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(255,255,255,0.07)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0 text-white/70 group-hover:text-white/90 transition-colors" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="text-sm font-medium text-white/65 group-hover:text-white/85 transition-colors">
            {isLoading ? 'Connecting...' : 'Continue with GitHub'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
          ) : (
            <span className="text-[11px] text-white/20 group-hover:text-white/35 transition-colors flex items-center gap-1">
              <Code2 className="w-3 h-3" />
              Developer
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
