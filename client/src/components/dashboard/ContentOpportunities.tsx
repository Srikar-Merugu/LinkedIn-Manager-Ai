'use client';

import { motion } from 'framer-motion';
import { Lightbulb, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

interface ContentOpportunity {
  id: string;
  topic: string;
  angle: string;
  format: 'post' | 'article' | 'carousel' | 'video' | 'poll';
  confidence: number;
  reason: string;
  suggestedHook: string;
  suggestedCTA: string;
}

interface ContentOpportunitiesProps {
  opportunities: ContentOpportunity[];
}

const formatConfig = {
  post: { label: 'Post', color: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
  article: { label: 'Article', color: 'bg-accent-500/10 text-accent-400 border-accent-500/20' },
  carousel: { label: 'Carousel', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  video: { label: 'Video', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  poll: { label: 'Poll', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

export function ContentOpportunities({ opportunities }: ContentOpportunitiesProps) {
  if (!opportunities?.length) return null;

  return (
    <GlassCard>
      <GlassCardHeader
        title="Content Opportunities"
        description="AI-generated content ideas based on your profile"
        action={
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <Sparkles className="w-4 h-4" />
            <span>AI Generated</span>
          </div>
        }
      />

      <div className="space-y-4">
        {opportunities.map((item, index) => {
          const format = formatConfig[item.format];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="glass rounded-xl p-5 glass-hover"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-400" />
                  <h4 className="text-sm font-semibold text-surface-100">
                    {item.topic}
                  </h4>
                </div>
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full border',
                  format.color
                )}>
                  {format.label}
                </span>
              </div>

              <p className="text-sm text-surface-300 mb-3">{item.angle}</p>

              <div className="glass rounded-lg p-3 mb-3">
                <p className="text-xs text-surface-500 mb-1">Suggested Hook</p>
                <p className="text-sm text-surface-200 italic">
                  "{item.suggestedHook}"
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-500"
                      style={{ width: `${item.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-surface-500">
                    {Math.round(item.confidence * 100)}% confidence
                  </span>
                </div>

                <button className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors">
                  Use this idea
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}
