'use client';

import { motion } from 'framer-motion';
import {
  ListChecks,
  ArrowRight,
  Clock,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { cn, getPriorityColor, getEffortColor } from '@/lib/utils';

interface Recommendation {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actions: string[];
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short-term' | 'long-term';
  metrics: {
    current: number;
    target: number;
  };
}

interface RecommendationsProps {
  recommendations: Recommendation[];
  quickWins?: Recommendation[];
}

const priorityConfig = {
  critical: {
    label: 'Critical',
    icon: AlertTriangle,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    barColor: 'bg-red-500',
  },
  high: {
    label: 'High Priority',
    icon: AlertTriangle,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    barColor: 'bg-amber-500',
  },
  medium: {
    label: 'Medium',
    icon: Zap,
    color: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
    barColor: 'bg-brand-500',
  },
  low: {
    label: 'Optional',
    icon: Zap,
    color: 'text-surface-400 bg-surface-500/10 border-surface-500/20',
    barColor: 'bg-surface-500',
  },
};

export function Recommendations({ recommendations, quickWins }: RecommendationsProps) {
  if (!recommendations?.length) return null;

  const getTimeframeColor = (timeframe: string) => {
    switch (timeframe) {
      case 'immediate': return 'text-red-400';
      case 'short-term': return 'text-amber-400';
      case 'long-term': return 'text-accent-400';
      default: return 'text-surface-500';
    }
  };

  return (
    <div className="space-y-6">
      {quickWins && quickWins.length > 0 && (
        <GlassCard>
          <GlassCardHeader
            title="Quick Wins"
            description="High-impact, low-effort actions to take now"
            action={
              <span className="badge-success text-xs">
                {quickWins.length} available
              </span>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickWins.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="glass rounded-xl p-4 glass-hover"
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-accent-500/10 shrink-0">
                    <Zap className="w-4 h-4 text-accent-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-surface-200">
                      {item.title}
                    </h4>
                    <p className="text-xs text-surface-400 mt-1">
                      {item.expectedImpact}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <GlassCardHeader
          title="Recommendations"
          description="Personalized actions to improve your LinkedIn presence"
          action={
            <div className="flex items-center gap-2 text-sm text-surface-500">
              <ListChecks className="w-4 h-4" />
              <span>{recommendations.length} items</span>
            </div>
          }
        />

        <div className="space-y-4">
          {recommendations.map((item, index) => {
            const priority = priorityConfig[item.priority];
            const PriorityIcon = priority.icon;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="glass rounded-xl p-5 glass-hover"
              >
                <div className="flex items-start gap-4">
                  <div className={cn('p-2 rounded-lg shrink-0', priority.color)}>
                    <PriorityIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-surface-100">
                          {item.title}
                        </h4>
                        <p className="text-xs text-surface-500 mt-0.5 capitalize">
                          {item.type} • {item.timeframe}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full border',
                          priority.color
                        )}>
                          {priority.label}
                        </span>
                        <span className={cn(
                          'text-xs font-medium',
                          getEffortColor(item.effort)
                        )}>
                          {item.effort} effort
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-surface-400 mb-3">
                      {item.description}
                    </p>

                    {item.actions.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {item.actions.map((action, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs text-surface-400"
                          >
                            <div className="w-1 h-1 rounded-full bg-surface-600" />
                            {action}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-3 text-xs text-surface-500">
                        <Clock className={cn('w-3.5 h-3.5', getTimeframeColor(item.timeframe))} />
                        <span className="capitalize">{item.timeframe}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{item.expectedImpact}</span>
                      </div>

                      {item.metrics && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-surface-500">
                            {item.metrics.current} → {item.metrics.target}
                          </span>
                          <div className="w-20 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-1000',
                                priority.barColor
                              )}
                              style={{
                                width: `${item.metrics.current > 0
                                  ? (item.metrics.current / item.metrics.target) * 100
                                  : 0}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
