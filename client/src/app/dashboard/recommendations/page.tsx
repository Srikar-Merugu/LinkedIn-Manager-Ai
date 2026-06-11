'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, Target, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { api } from '@/lib/api';

type Recommendation = {
  title: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
};

const impactColors: Record<string, string> = {
  high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const stateData = await api.onboarding.getState().catch(() => null);
      const analysisResult = stateData?.state?.analysisResult;

      if (analysisResult) {
        const recs: Recommendation[] = [];

        // Convert quick wins to recommendations
        if (analysisResult.quickWins) {
          for (const win of analysisResult.quickWins) {
            recs.push({
              title: win.action,
              reason: `Impact: ${win.impact} | Effort: ${win.effort}`,
              impact: win.impact as 'high' | 'medium' | 'low',
              category: 'Quick Win',
            });
          }
        }

        // Add strategy-based recommendations
        if (analysisResult.strategy90Day) {
          for (const phase of analysisResult.strategy90Day.slice(0, 2)) {
            for (const task of phase.tasks.slice(0, 2)) {
              recs.push({
                title: task,
                reason: `${phase.focus} — ${phase.week}`,
                impact: 'medium',
                category: phase.focus,
              });
            }
          }
        }

        // Add weakness-based recommendations
        if (analysisResult.profileSummary?.weaknesses) {
          for (const weakness of analysisResult.profileSummary.weaknesses.slice(0, 3)) {
            recs.push({
              title: `Address: ${weakness}`,
              reason: 'This was identified as a gap in your profile analysis',
              impact: 'high',
              category: 'Profile Improvement',
            });
          }
        }

        setRecommendations(recs.length > 0 ? recs : [
          { title: 'Complete your onboarding analysis', reason: 'Run a full profile analysis to get personalized recommendations', impact: 'high', category: 'Getting Started' },
        ]);
      } else {
        setRecommendations([
          { title: 'Complete your onboarding analysis', reason: 'Run a full profile analysis to get personalized recommendations', impact: 'high', category: 'Getting Started' },
        ]);
      }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white/90">Recommendations</h1>
        <p className="text-sm text-white/40 mt-1">AI-powered suggestions to grow your personal brand.</p>
      </div>
      <div className="grid gap-4">
        {recommendations.map((r, i) => (
          <motion.div
            key={`${r.title}-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
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
