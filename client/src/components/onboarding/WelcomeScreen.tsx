'use client';

import { motion } from 'framer-motion';
import { Sparkles, Linkedin, Brain, TrendingUp } from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const benefits = [
    { icon: Brain, text: 'AI analyzes your LinkedIn, resume, GitHub & portfolio' },
    { icon: TrendingUp, text: 'Discovers your personal brand DNA automatically' },
    { icon: Sparkles, text: 'Generates a content strategy tailored to your goals' },
  ];

  return (
    <div className="max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-lg shadow-brand-500/25 mb-6">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-4xl font-bold text-surface-100 mb-4">
          Welcome to <span className="text-gradient">PersonaOS</span>
        </h1>
        <p className="text-xl text-surface-400 mb-8 leading-relaxed">
          We'll analyze your professional identity and build your personal brand strategy.
          No guesswork — just AI-powered intelligence.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="space-y-3 mb-10 text-left max-w-md mx-auto"
      >
        {benefits.map((benefit, i) => (
          <motion.div
            key={benefit.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
              <benefit.icon className="w-4 h-4 text-brand-400" />
            </div>
            <span className="text-sm text-surface-300">{benefit.text}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="space-y-4"
      >
        <p className="text-sm text-surface-500">
          Takes about <span className="text-surface-300 font-medium">5 minutes</span>
        </p>
        <button onClick={onComplete} className="btn-primary text-base px-10 py-3.5 gap-2 glow">
          <Linkedin className="w-5 h-5" />
          Start Onboarding
        </button>
      </motion.div>
    </div>
  );
}
