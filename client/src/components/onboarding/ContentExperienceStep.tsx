'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PenLine, Hash, XCircle, Sparkles, Calendar } from 'lucide-react';

interface ContentExperienceStepProps {
  onComplete: (data: { frequency: string }) => void;
}

const FREQUENCIES = [
  { value: 'never', label: 'Never posted', description: 'I\'m new to content creation', icon: XCircle },
  { value: 'occasionally', label: 'Occasionally', description: 'A few times a year', icon: Hash },
  { value: 'monthly', label: 'Monthly', description: 'Once or twice a month', icon: Calendar },
  { value: 'weekly', label: 'Weekly', description: 'Multiple times a week', icon: PenLine },
  { value: 'daily', label: 'Daily', description: 'I post every day', icon: Sparkles },
];

export function ContentExperienceStep({ onComplete }: ContentExperienceStepProps) {
  const [frequency, setFrequency] = useState('');

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg mb-4">
          <PenLine className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Content Experience</h2>
        <p className="text-surface-400">How often do you currently post on LinkedIn?</p>
      </motion.div>

      <div className="space-y-2 mb-8">
        {FREQUENCIES.map((opt, i) => (
          <motion.button
            key={opt.value}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setFrequency(opt.value)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 ${
              frequency === opt.value
                ? 'bg-brand-500/10 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                : 'glass border border-white/5 hover:border-white/10'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              frequency === opt.value ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-800 text-surface-400'
            }`}>
              <opt.icon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-sm font-medium ${frequency === opt.value ? 'text-brand-300' : 'text-surface-200'}`}>{opt.label}</p>
              <p className="text-xs text-surface-500">{opt.description}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <button onClick={() => onComplete({ frequency })} disabled={!frequency} className="btn-primary w-full py-3">
        Continue
      </button>
    </div>
  );
}
