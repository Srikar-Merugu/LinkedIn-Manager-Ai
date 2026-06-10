'use client';

import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, Target, Sparkles, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const recommendations = [
  { title: 'Post about AI trends', reason: 'Your audience engages most with AI content', impact: 'High', category: 'Content' },
  { title: 'Connect with industry leaders', reason: 'Expand your network in target companies', impact: 'Medium', category: 'Network' },
  { title: 'Update your brand DNA', reason: 'Your brand has evolved since last analysis', impact: 'High', category: 'Brand' },
  { title: 'Schedule weekly posts', reason: 'Consistent posting increases reach by 3x', impact: 'Medium', category: 'Content' },
];

const impactColors: Record<string, string> = {
  High: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white/90">Recommendations</h1>
        <p className="text-sm text-white/40 mt-1">AI-powered suggestions to grow your personal brand.</p>
      </div>
      <div className="grid gap-4">
        {recommendations.map((r, i) => (
          <motion.div
            key={r.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="p-5 group cursor-pointer hover:border-brand-500/30 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-brand-400" />
                    <h3 className="font-semibold text-white/90">{r.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${impactColors[r.impact] || ''}`}>
                      {r.impact} Impact
                    </span>
                  </div>
                  <p className="text-sm text-white/50">{r.reason}</p>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">{r.category}</span>
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
