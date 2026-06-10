'use client';

import { motion } from 'framer-motion';
import { Target, ArrowRight, TrendingUp, Zap } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const opportunities = [
  { title: 'Speaking Engagement', source: 'LinkedIn', match: 94, description: 'Tech conference looking for AI thought leaders' },
  { title: 'Consulting Project', source: 'Network', match: 88, description: 'Startup needs brand strategy consultation' },
  { title: 'Podcast Appearance', source: 'LinkedIn', match: 82, description: 'Podcast about personal branding in tech' },
];

export default function OpportunitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white/90">Opportunities</h1>
        <p className="text-sm text-white/40 mt-1">AI-matched opportunities based on your brand and goals.</p>
      </div>
      <div className="grid gap-4">
        {opportunities.map((op, i) => (
          <motion.div
            key={op.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="p-5 group cursor-pointer hover:border-brand-500/30 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-400" />
                    <h3 className="font-semibold text-white/90">{op.title}</h3>
                  </div>
                  <p className="text-sm text-white/50">{op.description}</p>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{op.source}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{op.match}% match</span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
