'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Loader2, Check, Brain, FileText, BarChart3, Target, Sparkles, Layout } from 'lucide-react';

const steps = [
  { icon: Loader2, label: 'Importing Professional Identity', color: 'from-blue-500/20 to-blue-500/5' },
  { icon: Brain, label: 'Analyzing LinkedIn Profile', color: 'from-purple-500/20 to-purple-500/5' },
  { icon: FileText, label: 'Building Brand DNA', color: 'from-brand-500/20 to-brand-500/5' },
  { icon: BarChart3, label: 'Building Voice DNA', color: 'from-accent-500/20 to-accent-500/5' },
  { icon: Target, label: 'Generating Strategy', color: 'from-cyan-500/20 to-cyan-500/5' },
  { icon: Sparkles, label: 'Preparing Dashboard', color: 'from-violet-500/20 to-violet-500/5' },
];

interface AuthLoadingSequenceProps {
  onComplete: () => void;
}

export function AuthLoadingSequence({ onComplete }: AuthLoadingSequenceProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= steps.length) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-4 border border-white/[0.06]">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-6 h-6 text-brand-400" />
          </motion.div>
        </div>
        <h3 className="text-lg font-semibold text-white/90">Initializing PersonaOS</h3>
        <p className="text-sm text-white/40 mt-1">Building your AI growth system</p>
      </motion.div>

      <div className="space-y-3 mt-6">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: i <= currentStep ? 1 : 0.3,
              x: 0,
            }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-xl transition-all duration-500"
            style={{
              background: i === currentStep
                ? 'rgba(255,255,255,0.04)'
                : 'transparent',
              border: i === currentStep
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid transparent',
            }}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                i < currentStep
                  ? 'bg-accent-500/20'
                  : i === currentStep
                  ? `bg-gradient-to-br ${step.color}`
                  : 'bg-white/[0.03]'
              }`}
            >
              {i < currentStep ? (
                <Check className="w-4 h-4 text-accent-400" />
              ) : i === currentStep ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-4 h-4 text-brand-400" />
                </motion.div>
              ) : (
                <step.icon className="w-4 h-4 text-white/20" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm transition-colors duration-300 ${
                    i <= currentStep ? 'text-white/80' : 'text-white/20'
                  }`}
                >
                  {step.label}
                </span>
                {i < currentStep && (
                  <span className="text-[10px] text-accent-400/60 font-medium">Done</span>
                )}
              </div>

              <div className="mt-1.5 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                  initial={{ width: '0%' }}
                  animate={{
                    width: i < currentStep ? '100%' : i === currentStep ? '60%' : '0%',
                  }}
                  transition={{
                    duration: i === currentStep ? 1.5 : 0.5,
                    ease: 'easeInOut',
                  }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center pt-2"
      >
        <div className="flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              animate={{
                backgroundColor: i <= currentStep
                  ? 'rgba(99,102,241,0.6)'
                  : 'rgba(255,255,255,0.1)',
                scale: i === currentStep ? [1, 1.5, 1] : 1,
              }}
              transition={{
                scale: { duration: 1, repeat: Infinity },
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
