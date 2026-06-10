'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LinkedInButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export function LinkedInButton({ onClick, isLoading }: LinkedInButtonProps) {
  return (
    <motion.button
      id="linkedin-auth-btn"
      onClick={onClick}
      disabled={isLoading}
      className="relative w-full group overflow-hidden rounded-xl disabled:opacity-60"
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Glow layer */}
      <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"
        style={{ background: 'linear-gradient(135deg, rgba(10,102,194,0.6), rgba(10,125,208,0.4))' }} />

      {/* Button surface */}
      <div
        className="relative flex items-center justify-between px-5 py-3.5 rounded-xl border transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, #0a66c2 0%, #0b72d6 50%, #0a66c2 100%)',
          borderColor: 'rgba(255,255,255,0.15)',
          boxShadow: '0 2px 16px rgba(10,102,194,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
      >
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-xl" />

        <div className="flex items-center gap-3 relative z-10">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#fff">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          <span className="text-sm font-semibold text-white">
            {isLoading ? 'Connecting...' : 'Continue with LinkedIn'}
          </span>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span className="text-[11px] font-semibold text-white">Recommended</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-label */}
      <p className="text-[11px] text-white/25 text-center mt-1.5 group-hover:text-white/40 transition-colors">
        Best profile analysis experience
      </p>
    </motion.button>
  );
}
