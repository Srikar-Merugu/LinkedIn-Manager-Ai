'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { cn, getImpactColor } from '@/lib/utils';

interface Weakness {
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  score: number;
  evidence: string[];
}

interface WeaknessAnalysisProps {
  weaknesses: Weakness[];
}

export function WeaknessAnalysis({ weaknesses }: WeaknessAnalysisProps) {
  if (!weaknesses?.length) return null;

  return (
    <GlassCard>
      <GlassCardHeader
        title="Areas for Improvement"
        description="Opportunities to strengthen your profile"
        action={
          <span className="text-sm text-surface-500">
            {weaknesses.length} found
          </span>
        }
      />

      <div className="space-y-4">
        {weaknesses.map((weakness, index) => (
          <motion.div
            key={weakness.title}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="glass rounded-xl p-5 glass-hover"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-surface-100">
                      {weakness.title}
                    </h4>
                    <p className="text-xs text-surface-500 mt-0.5">{weakness.category}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full border',
                      getImpactColor(weakness.impact)
                    )}>
                      {weakness.impact}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-1000"
                          style={{ width: `${weakness.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-surface-400">
                        {weakness.score}%
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-surface-400 mt-2">{weakness.description}</p>

                <button className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 mt-3 transition-colors">
                  View improvement suggestions
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}
