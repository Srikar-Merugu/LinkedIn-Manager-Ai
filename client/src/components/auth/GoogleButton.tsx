'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface GoogleButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export function GoogleButton({ onClick, isLoading }: GoogleButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      disabled={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full group overflow-hidden rounded-xl"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div
        className="relative flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300"
        style={{
          background: isHovered
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(255,255,255,0.04)',
          borderColor: isHovered
            ? 'rgba(255,255,255,0.15)'
            : 'rgba(255,255,255,0.06)',
        }}
      >
        {isHovered && (
          <div
            className="absolute inset-0 rounded-xl opacity-20"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.2))',
              filter: 'blur(20px)',
            }}
          />
        )}
        <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
          <path
            fill="#fff"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fillOpacity="0.8"
          />
          <path
            fill="#fff"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fillOpacity="0.8"
          />
          <path
            fill="#fff"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fillOpacity="0.8"
          />
          <path
            fill="#fff"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fillOpacity="0.8"
          />
        </svg>
        <span className="text-sm font-medium text-white/80 relative z-10">
          {isLoading ? 'Connecting...' : 'Continue with Google'}
        </span>
      </div>
    </motion.button>
  );
}
