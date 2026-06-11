'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, ArrowRight, TrendingUp, Zap, Loader2, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { api } from '@/lib/api';

type Opportunity = {
  title: string;
  source: string;
  match: number;
  description: string;
};

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const stateData = await api.onboarding.getState().catch(() => null);
      const analysisResult = stateData?.state?.analysisResult;

      if (analysisResult) {
        const opps: Opportunity[] = [];
        const scores = analysisResult.scores || {};
        const pillars = analysisResult.contentPillars || [];
        const goals = stateData?.state?.careerGoals || [];

        // Generate opportunities from content pillars
        for (const pillar of pillars.slice(0, 3)) {
          opps.push({
            title: `Create Content: ${pillar}`,
            source: 'Content Strategy',
            match: Math.round(70 + (scores.contentReadiness || 0) * 0.3),
            description: `Write about ${pillar} to establish authority in this area`,
          });
        }

        // Generate opportunities from career goals
        if (goals.includes('job_search')) {
          opps.push({
            title: 'Job Search Optimization',
            source: 'Career Goals',
            match: Math.round(75 + (scores.careerOpportunity || 0) * 0.25),
            description: 'Optimize your profile for recruiters and hiring managers',
          });
        }
        if (goals.includes('personal_brand')) {
          opps.push({
            title: 'Thought Leadership Campaign',
            source: 'Career Goals',
            match: Math.round(80 + (scores.personalBrand || 0) * 0.2),
            description: 'Build your personal brand through consistent content',
          });
        }
        if (goals.includes('startup')) {
          opps.push({
            title: 'Startup Visibility',
            source: 'Career Goals',
            match: 78,
            description: 'Share your startup journey to attract co-founders and investors',
          });
        }

        // Generate opportunities from strengths
        if (scores.technicalLeadership > 60) {
          opps.push({
            title: 'Technical Speaking',
            source: 'Profile Strength',
            match: Math.round(70 + scores.technicalLeadership * 0.3),
            description: 'Your technical expertise makes you a strong candidate for tech talks',
          });
        }

        setOpportunities(opps.length > 0 ? opps : [
          { title: 'Complete your analysis', source: 'Getting Started', match: 100, description: 'Run a full analysis to discover personalized opportunities' },
        ]);
      } else {
        setOpportunities([
          { title: 'Complete your analysis', source: 'Getting Started', match: 100, description: 'Run a full analysis to discover personalized opportunities' },
        ]);
      }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white/90">Opportunities</h1>
        <p className="text-sm text-white/40 mt-1">AI-matched opportunities based on your brand and goals.</p>
      </div>
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
