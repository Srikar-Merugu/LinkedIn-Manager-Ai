'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, TrendingUp, ArrowUpRight } from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { cn, getImpactColor } from '@/lib/utils';

interface Strength {
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  score: number;
  evidence: string[];
}

interface StrengthAnalysisProps {
  strengths: Strength[];
}

export function StrengthAnalysis({ strengths }: StrengthAnalysisProps) {
  if (!strengths?.length) return null;

  return (
    <GlassCard>
      <GlassCardHeader
        title="Strengths"
        description="Key areas where your profile excels"
        action={
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <TrendingUp className="w-4 h-4" />
            <span>{strengths.length} identified</span>
          </div>
        }
      />

      <div className="space-y-4">
        {strengths.map((strength, index) => (
          <motion.div
            key={strength.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="glass rounded-xl p-5 glass-hover"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-accent-500/10 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-accent-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-surface-100">
                      {strength.title}
                    </h4>
                    <p className="text-xs text-surface-500 mt-0.5">{strength.category}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full border',
                      getImpactColor(strength.impact)
                    )}>
                      {strength.impact}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-500 transition-all duration-1000"
                          style={{ width: `${strength.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-surface-400">
                        {strength.score}%
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-surface-400 mt-2">{strength.description}</p>

                {strength.evidence.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {strength.evidence.map((item) => (
                      <span
                        key={item}
                        className="text-xs text-surface-500 bg-surface-800/50 px-2 py-1 rounded-lg"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}
