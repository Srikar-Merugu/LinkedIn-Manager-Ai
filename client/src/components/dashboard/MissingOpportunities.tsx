'use client';

import { motion } from 'framer-motion';
import { Target, Zap, Clock, TrendingUp } from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

interface MissingOpportunity {
  id: string;
  category: string;
  title: string;
  description: string;
  potentialImpact: string;
  effortToFix: 'low' | 'medium' | 'high';
}

interface MissingOpportunitiesProps {
  opportunities: MissingOpportunity[];
}

const effortConfig = {
  low: { label: 'Quick Fix', color: 'text-accent-400 bg-accent-500/10 border-accent-500/20' },
  medium: { label: 'Medium Effort', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  high: { label: 'Significant', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

export function MissingOpportunities({ opportunities }: MissingOpportunitiesProps) {
  if (!opportunities?.length) return null;

  return (
    <GlassCard>
      <GlassCardHeader
        title="Missing Opportunities"
        description="Gaps in your profile that could unlock growth"
        action={
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <Target className="w-4 h-4" />
            <span>{opportunities.length} gaps</span>
          </div>
        }
      />

      <div className="space-y-3">
        {opportunities.map((item, index) => {
          const effort = effortConfig[item.effortToFix];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
              className="glass rounded-xl p-4 glass-hover"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-brand-500/10 shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-brand-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-medium text-surface-200">
                        {item.title}
                      </h4>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {item.category}
                      </p>
                    </div>

                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full border shrink-0',
                      effort.color
                    )}>
                      {effort.label}
                    </span>
                  </div>

                  <p className="text-xs text-surface-400 mt-2">{item.description}</p>

                  <div className="flex items-center gap-2 mt-2 text-xs text-surface-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>{item.potentialImpact}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}
