'use client';

import { motion } from 'framer-motion';
import { Linkedin, FileText, TrendingUp, Target, Bell, BarChart3 } from 'lucide-react';

const cards = [
  { icon: Linkedin, label: 'LinkedIn Intelligence', color: 'from-blue-500/20 to-blue-500/5' },
  { icon: FileText, label: 'Brand DNA', color: 'from-purple-500/20 to-purple-500/5' },
  { icon: TrendingUp, label: 'Voice DNA', color: 'from-brand-500/20 to-brand-500/5' },
  { icon: Target, label: 'Content Strategy', color: 'from-cyan-500/20 to-cyan-500/5' },
  { icon: Bell, label: 'Opportunity Detection', color: 'from-violet-500/20 to-violet-500/5' },
  { icon: BarChart3, label: 'Analytics Intelligence', color: 'from-indigo-500/20 to-indigo-500/5' },
];

export function FloatingCards() {
  return (
    <div className="relative w-full max-w-[420px] mx-auto" style={{ perspective: '800px' }}>
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          className="absolute left-0 right-0 mx-auto w-[280px]"
          style={{
            top: `${i * 50}px`,
            transformStyle: 'preserve-3d',
          }}
          initial={{ opacity: 0, y: 40, rotateX: 10 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [40, 0, 0, -20],
            rotateX: [10, 0, 0, -5],
          }}
          transition={{
            duration: 10,
            delay: i * 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.12, 0.88, 1],
          }}
        >
          <div
            className="relative rounded-xl border border-white/[0.06] backdrop-blur-xl p-3.5"
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-4 h-4 text-white/70" />
              </div>
              <span className="text-sm font-medium text-white/60">{card.label}</span>
            </div>
            <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-500/40 to-accent-500/40"
                initial={{ width: '0%' }}
                animate={{ width: ['0%', '100%', '0%'] }}
                transition={{ duration: 5, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
