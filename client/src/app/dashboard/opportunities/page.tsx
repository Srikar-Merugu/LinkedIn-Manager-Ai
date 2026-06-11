'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Target, ArrowRight, TrendingUp, Clock, Gauge, Layers, Lightbulb, Loader2, AlertCircle } from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { api } from '@/lib/api';

type Opportunity = {
  title: string;
  description: string;
  score: number;
  pillar: string;
  effort: string;
  timeframe: string;
};

type ContentPillar = {
  name: string;
  description: string;
  score: number;
  topics: string[];
  authorityScore: number;
  engagementPotential: number;
  careerAlignment: number;
};

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contentPillars, setContentPillars] = useState<ContentPillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noReport, setNoReport] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoReport(false);

      const report = await api.report.get().catch((err) => {
        if (err?.message?.includes('404') || err?.message?.includes('No analysis report')) {
          return null;
        }
        throw err;
      });

      if (!report) {
        setNoReport(true);
        return;
      }

      setOpportunities(report.opportunities || []);
      setContentPillars(report.contentPillars || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-surface-400">{error}</p>
        </div>
      </div>
    );
  }

  if (noReport) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white/90">Opportunities</h1>
          <p className="text-sm text-white/40 mt-1">AI-matched opportunities based on your brand and goals.</p>
        </div>
        <GlassCard className="text-center py-12">
          <Target className="w-12 h-12 text-surface-500 mx-auto mb-4" />
          <p className="text-surface-400 mb-4">Complete onboarding to see opportunities</p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors"
          >
            Go to Onboarding
            <ArrowRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white/90">Opportunities</h1>
        <p className="text-sm text-white/40 mt-1">AI-matched opportunities based on your brand and goals.</p>
      </div>

      {opportunities.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white/80">Opportunities</h2>
          <div className="grid gap-4">
            {opportunities.map((op, i) => (
              <motion.div
                key={`${op.title}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="p-5 group cursor-pointer hover:border-brand-500/30 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-brand-400" />
                        <h3 className="font-semibold text-white/90">{op.title}</h3>
                      </div>
                      <p className="text-sm text-white/50">{op.description}</p>
                      <div className="flex items-center flex-wrap gap-3 text-xs text-white/40">
                        {op.pillar && (
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {op.pillar}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {op.score}% match
                        </span>
                        {op.effort && (
                          <span className="flex items-center gap-1">
                            <Gauge className="w-3 h-3" />
                            {op.effort}
                          </span>
                        )}
                        {op.timeframe && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {op.timeframe}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {contentPillars.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white/80">Content Pillars</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {contentPillars.map((pillar, i) => (
              <motion.div
                key={pillar.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (opportunities.length + i) * 0.05 }}
              >
                <GlassCard className="p-5 hover:border-brand-500/30 transition-all duration-300">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      <h3 className="font-semibold text-white/90">{pillar.name}</h3>
                    </div>
                    <p className="text-sm text-white/50">{pillar.description}</p>
                    <div className="flex items-center flex-wrap gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Score: {pillar.score}%
                      </span>
                      <span className="flex items-center gap-1">
                        Authority: {pillar.authorityScore}%
                      </span>
                      <span className="flex items-center gap-1">
                        Engagement: {pillar.engagementPotential}%
                      </span>
                    </div>
                    {pillar.topics && pillar.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {pillar.topics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-0.5 rounded-md bg-surface-800/50 text-xs text-surface-300"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {opportunities.length === 0 && contentPillars.length === 0 && (
        <GlassCard className="text-center py-12">
          <Target className="w-12 h-12 text-surface-500 mx-auto mb-4" />
          <p className="text-surface-400">No opportunities or content pillars found in your analysis report.</p>
        </GlassCard>
      )}
    </div>
  );
}
