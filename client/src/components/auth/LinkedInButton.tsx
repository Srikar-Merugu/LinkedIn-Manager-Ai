'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface LinkedInButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export function LinkedInButton({ onClick, isLoading }: LinkedInButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      disabled={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full group overflow-hidden rounded-xl"
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-xl opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500" />

      <div
        className="relative flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border transition-all duration-300"
        style={{
          background: isHovered
            ? 'linear-gradient(135deg, #0a66c2, #0a7dd0)'
            : 'linear-gradient(135deg, #0a66c2, #0a7dd0)',
          borderColor: isHovered
            ? 'rgba(255,255,255,0.2)'
            : 'rgba(255,255,255,0.1)',
          boxShadow: isHovered
            ? '0 4px 24px rgba(10,102,194,0.4)'
            : '0 2px 12px rgba(10,102,194,0.2)',
        }}
      >
        <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24" fill="#fff">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        <span className="text-sm font-semibold text-white relative z-10">
          {isLoading ? 'Connecting...' : 'Continue with LinkedIn'}
        </span>

        <div className="relative z-10 px-2 py-0.5 rounded-full bg-white/15 border border-white/10">
          <span className="text-[10px] font-medium text-white/80">Recommended</span>
        </div>
      </div>
    </motion.button>
  );
}
