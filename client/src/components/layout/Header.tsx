'use client';

import { motion } from 'framer-motion';
import { Bell, Search } from 'lucide-react';

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="sticky top-0 z-30"
    >
      <div className="glass rounded-b-2xl border-b border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                type="text"
                placeholder="Search insights..."
                className="input pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-ghost relative p-2">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-surface-950" />
            </button>

            <div className="h-6 w-px bg-surface-700/50" />

            {children}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
