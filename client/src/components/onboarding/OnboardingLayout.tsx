'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: string;
  currentStepIndex: number;
  totalSteps: number;
  percentage: number;
  stepLabel: string;
  stepDescription: string;
}

export function OnboardingLayout({
  children,
  currentStep,
  currentStepIndex,
  totalSteps,
  percentage,
  stepLabel,
  stepDescription,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.08),transparent_60%)]" />

      <header className="relative z-10">
        <nav className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-surface-100">PersonaOS</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-surface-200">{stepLabel}</p>
              <p className="text-xs text-surface-500">{stepDescription}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center">
              <span className="text-xs font-medium text-surface-400">{currentStepIndex + 1}/{totalSteps}</span>
            </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-6">
          <div className="w-full h-1 rounded-full bg-surface-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500"
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-surface-600">{percentage}% complete</span>
            <span className="text-[10px] text-surface-600">{totalSteps - currentStepIndex - 1} steps remaining</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
