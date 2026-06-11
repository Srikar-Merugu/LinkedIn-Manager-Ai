'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Brain, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AiAnalysisStepProps {
  progress: number;
  log: string[];
  isRunning: boolean;
  onRunAnalysis: () => void;
}

export function AiAnalysisStep({ progress, log, isRunning, onRunAnalysis }: AiAnalysisStepProps) {
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isRunning && !hasStarted.current) {
      hasStarted.current = true;
      onRunAnalysis();
    }
  }, [isRunning, onRunAnalysis]);

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg mb-4">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Building Your Intelligence</h2>
        <p className="text-surface-400">AI is analyzing your profile and generating your brand strategy.</p>
      </motion.div>

      <div className="glass rounded-2xl p-6 mb-6">
        <div className="space-y-3">
          {log.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm bg-brand-500/10 text-brand-400"
            >
              {i === log.length - 1 && isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-accent-400" />
              )}
              {entry}
            </motion.div>
          ))}
        </div>

        {isRunning && (
          <div className="mt-4 w-full h-1 rounded-full bg-surface-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500"
              animate={{ width: progress > 0 ? `${progress}%` : '10%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        {progress >= 100 && !isRunning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 flex items-center gap-2 text-accent-400"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Analysis complete!</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
