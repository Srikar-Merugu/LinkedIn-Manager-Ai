'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Lightbulb, TrendingUp, Target, ArrowRight, Loader2, AlertCircle, Zap, BarChart3 } from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { api } from '@/lib/api';

type QuickWin = {
  action: string;
  impact: string;
  effort: string;
  category: string;
};

type Opportunity = {
  title: string;
  description: string;
  score: number;
  pillar: string;
  effort: string;
  timeframe: string;
};

type AnalysisReport = {
  quickWins: QuickWin[];
  opportunities: Opportunity[];
} | null;

const impactColors: Record<string, string> = {
  high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const scoreColors: Record<string, string> = {
  high: 'text-emerald-400',
  medium: 'text-amber-400',
  low: 'text-blue-400',
};

export default function RecommendationsPage() {
  const [report, setReport] = useState<AnalysisReport>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.report.get();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
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

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <GlassCard className="p-8 text-center max-w-md">
          <Lightbulb className="w-12 h-12 text-brand-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white/90 mb-2">Complete onboarding to see recommendations</h2>
          <p className="text-surface-400 mb-6">Run a full profile analysis to get personalized AI-powered recommendations.</p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors"
          >
            Start Onboarding
            <ArrowRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      </div>
    );
  }

  const quickWins = report.quickWins || [];
  const opportunities = report.opportunities || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white/90">Recommendations</h1>
        <p className="text-sm text-white/40 mt-1">AI-powered suggestions to grow your personal brand.</p>
      </div>

      {/* Quick Wins Section */}
      {quickWins.length > 0 && (
        <section>
          <GlassCard className="p-0">
            <GlassCardHeader
              title="Quick Wins"
              description="High-impact actions you can take right now"
              className="px-6 pt-6 pb-0"
            />
            <div className="divide-y divide-white/5">
              {quickWins.map((win, i) => (
                <motion.div
                  key={`quickwin-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-6 py-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        <h3 className="font-medium text-white/90">{win.action}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span className={`px-2 py-0.5 rounded-full border ${impactColors[win.impact] || ''}`}>
                          {win.impact} impact
                        </span>
                        <span>Effort: {win.effort}</span>
                        <span className="uppercase tracking-wider">{win.category}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20 flex-shrink-0 mt-1" />
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </section>
      )}

      {/* Opportunities Section */}
      {opportunities.length > 0 && (
        <section>
          <GlassCard className="p-0">
            <GlassCardHeader
              title="Opportunities"
              description="Strategic opportunities to expand your personal brand"
              className="px-6 pt-6 pb-0"
            />
            <div className="divide-y divide-white/5">
              {opportunities.map((opp, i) => (
                <motion.div
                  key={`opportunity-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-6 py-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <h3 className="font-medium text-white/90">{opp.title}</h3>
                        <span className={`text-sm font-semibold ${scoreColors[opp.score >= 80 ? 'high' : opp.score >= 50 ? 'medium' : 'low']}`}>
                          {opp.score}
                        </span>
                      </div>
                      <p className="text-sm text-white/50">{opp.description}</p>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                          {opp.pillar}
                        </span>
                        <span>Effort: {opp.effort}</span>
                        <span>Timeframe: {opp.timeframe}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20 flex-shrink-0 mt-1" />
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </section>
      )}

      {quickWins.length === 0 && opportunities.length === 0 && (
        <GlassCard className="p-8 text-center">
          <Target className="w-12 h-12 text-brand-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white/90 mb-2">No recommendations yet</h2>
          <p className="text-surface-400">Your analysis report is being generated. Check back soon for personalized recommendations.</p>
        </GlassCard>
      )}
    </div>
  );
}
