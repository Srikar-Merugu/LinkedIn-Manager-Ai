'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Download,
  RefreshCw,
  Calendar,
  FileText,
  Share2,
  Linkedin,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { StrengthAnalysis } from '@/components/dashboard/StrengthAnalysis';
import { WeaknessAnalysis } from '@/components/dashboard/WeaknessAnalysis';
import { MissingOpportunities } from '@/components/dashboard/MissingOpportunities';
import { ContentOpportunities } from '@/components/dashboard/ContentOpportunities';
import { Recommendations } from '@/components/dashboard/Recommendations';
import { api } from '@/lib/api';
import { cn, getScoreColor } from '@/lib/utils';

interface AnalysisReport {
  _id?: string;
  userId?: string;
  linkedinAnalysis?: any;
  resumeAnalysis?: any;
  scores?: {
    technicalLeadership?: number;
    contentReadiness?: number;
    industryAuthority?: number;
    personalBrand?: number;
    careerOpportunity?: number;
  };
  strengths?: { title: string; category: string; description: string; impact: 'high' | 'medium' | 'low'; score: number; evidence: string[] }[];
  weaknesses?: { title: string; category: string; description: string; impact: 'high' | 'medium' | 'low'; score: number; evidence: string[] }[];
  contentPillars?: { name: string; description: string; score: number; topics: string[]; authorityScore: number; engagementPotential: number; careerAlignment: number }[];
  brandDNA?: any;
  writingDNA?: any;
  careerBlueprint?: any;
  strategy90Days?: any;
  quickWins?: { action: string; impact: string; effort: string; category: string }[];
  opportunities?: { title: string; description: string; score: number; pillar: string; effort: string; timeframe: string }[];
  generatedAt?: string;
}

type ScoreSection = {
  key: string;
  label: string;
  score: number;
  gradient: string;
  breakdown: Array<{ label: string; score: number; description?: string }>;
};

export default function IntelligenceReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    scores: true,
    strengths: true,
    weaknesses: true,
    opportunities: true,
    content: true,
    recommendations: true,
  });

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.report.get();
      if (!data || (data && typeof data === 'object' && 'message' in data && !data._id)) {
        setReport(null);
      } else {
        setReport(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load intelligence report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">Loading your intelligence report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-surface-100 mb-3">Failed to Load Report</h2>
          <p className="text-surface-400 mb-8 leading-relaxed">{error}</p>
          <button
            onClick={loadReport}
            className="btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-10 h-10 text-brand-400" />
          </div>
          <h2 className="text-xl font-semibold text-surface-100 mb-3">No Intelligence Report Found</h2>
          <p className="text-surface-400 mb-8 leading-relaxed">
            Complete onboarding to see your intelligence report
          </p>
          <a
            href="/onboarding"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Go to Onboarding
          </a>
        </div>
      </div>
    );
  }

  const scores = report.scores || {};
  const strengths = report.strengths || [];
  const weaknesses = report.weaknesses || [];
  const contentPillars = report.contentPillars || [];
  const quickWins = report.quickWins || [];
  const opportunities = report.opportunities || [];

  const scoreSections: ScoreSection[] = [
    {
      key: 'technicalLeadership',
      label: 'Technical Leadership',
      score: scores.technicalLeadership || 0,
      gradient: 'from-brand-500 to-brand-600',
      breakdown: (strengths || []).filter(s => s.category === 'technical').map(s => ({
        label: s.title,
        score: s.score || 0,
        description: s.description,
      })),
    },
    {
      key: 'contentReadiness',
      label: 'Content Readiness',
      score: scores.contentReadiness || 0,
      gradient: 'from-rose-500 to-rose-600',
      breakdown: (contentPillars || []).map(p => ({
        label: p.name,
        score: p.score || 0,
        description: p.description,
      })),
    },
    {
      key: 'industryAuthority',
      label: 'Industry Authority',
      score: scores.industryAuthority || 0,
      gradient: 'from-amber-500 to-amber-600',
      breakdown: (strengths || []).filter(s => s.category === 'authority' || s.category === 'industry').map(s => ({
        label: s.title,
        score: s.score || 0,
        description: s.description,
      })),
    },
    {
      key: 'personalBrand',
      label: 'Personal Brand',
      score: scores.personalBrand || 0,
      gradient: 'from-accent-500 to-accent-600',
      breakdown: (strengths || []).filter(s => s.category === 'brand' || s.category === 'personal').map(s => ({
        label: s.title,
        score: s.score || 0,
        description: s.description,
      })),
    },
    {
      key: 'careerOpportunity',
      label: 'Career Opportunity',
      score: scores.careerOpportunity || 0,
      gradient: 'from-purple-500 to-purple-600',
      breakdown: (weaknesses || []).filter(w => w.category === 'career' || w.category === 'opportunity').map(w => ({
        label: w.title,
        score: w.score || 0,
        description: w.description,
      })),
    },
  ];

  const overallScore = Math.round(
    (scores.technicalLeadership || 0) +
    (scores.contentReadiness || 0) +
    (scores.industryAuthority || 0) +
    (scores.personalBrand || 0) +
    (scores.careerOpportunity || 0)
  ) / 5;

  const mappedContentOpportunities = (contentPillars || []).map(pillar => ({
    id: pillar.name,
    topic: pillar.name,
    angle: pillar.description,
    format: 'post' as const,
    confidence: pillar.score || 0,
    reason: (pillar.topics || []).join(', '),
    suggestedHook: `Authority Score: ${pillar.authorityScore || 0}/100`,
    suggestedCTA: `Engagement Potential: ${pillar.engagementPotential || 0}%`,
  }));

  const mappedMissingOpportunities = (opportunities || []).map((opp, index) => ({
    id: `opp-${index}`,
    category: opp.pillar || 'General',
    title: opp.title,
    description: opp.description,
    potentialImpact: `Score: ${opp.score || 0}/100`,
    effortToFix: (opp.effort as 'low' | 'medium' | 'high') || 'medium',
  }));

  const mappedRecommendations = (quickWins || []).map((qw, index) => ({
    id: `qw-${index}`,
    type: qw.category || 'general',
    priority: qw.effort === 'low' ? 'high' as const : qw.effort === 'medium' ? 'medium' as const : 'low' as const,
    title: qw.action,
    description: qw.impact,
    actions: [qw.action],
    expectedImpact: qw.impact,
    effort: (qw.effort as 'low' | 'medium' | 'high') || 'medium',
    timeframe: 'immediate' as const,
    metrics: { current: 0, target: 0 },
  }));

  const quickWinRecommendations = mappedRecommendations.filter(
    r => r.effort === 'low' && r.priority === 'high'
  );

  const positioning = report.brandDNA?.positioning || '';

  return (
    <StaggerContainer className="space-y-8">
      <StaggerItem>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-brand-500/10">
                <BarChart3 className="w-5 h-5 text-brand-400" />
              </div>
              <h1 className="text-2xl font-bold text-surface-100">
                LinkedIn Intelligence Report
              </h1>
            </div>
            <p className="text-surface-400 ml-12">
              Comprehensive analysis of your LinkedIn presence and recommendations for growth
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <Calendar className="w-3.5 h-3.5" />
              {report.generatedAt
                ? new Date(report.generatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A'}
            </div>
            <button className="btn-secondary gap-2 text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="btn-ghost gap-2 text-sm">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {scoreSections.map(({ key, label, score }) => (
            <GlassCard key={key} className="text-center p-6" hover>
              <ScoreGauge
                score={score || 0}
                label={label}
                size="sm"
              />
            </GlassCard>
          ))}
        </div>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader
            title="Score Breakdown"
            description="Detailed view of all scoring dimensions"
            action={
              <button
                onClick={() => toggleSection('scores')}
                className="btn-ghost p-1"
              >
                {expandedSections.scores ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            }
          />

          <AnimatePresence>
            {expandedSections.scores && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 overflow-hidden"
              >
                {scoreSections.map(({ key, label, score, gradient, breakdown }) => (
                  <div key={key}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient}`} />
                      <h3 className="text-sm font-semibold text-surface-200">
                        {label}
                      </h3>
                      <span className={cn('text-sm font-bold', getScoreColor(score || 0))}>
                        {(score || 0)}/100
                      </span>
                    </div>

                    {breakdown.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {breakdown.map((item) => (
                          <div
                            key={item.label}
                            className="glass rounded-xl p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-surface-400">
                                {item.label}
                              </span>
                              <span className={cn('text-xs font-bold', getScoreColor(item.score || 0))}>
                                {item.score || 0}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.score || 0}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className={cn('h-full rounded-full', `bg-gradient-to-r ${gradient}`)}
                              />
                            </div>
                            {item.description && (
                              <p className="text-xs text-surface-500 mt-2">{item.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader
            title="Analysis Summary"
            description="AI-generated overview of your LinkedIn profile"
            action={
              <div className="flex items-center gap-2 text-xs text-surface-500">
                <Sparkles className="w-3.5 h-3.5" />
                AI Generated
              </div>
            }
          />
          <p className="text-surface-300 leading-relaxed">
            {positioning || 'Complete your analysis to see a summary of your profile.'}
          </p>
        </GlassCard>
      </StaggerItem>

      {/* Voice Profile + Career Direction */}
      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voice Profile */}
          <GlassCard>
            <GlassCardHeader title="Voice Profile" description="Your unique writing and communication style" />
            <div className="space-y-4">
              {report.writingDNA ? (
                <>
                  {report.writingDNA.tone && (
                    <div>
                      <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Tone</p>
                      <p className="text-sm text-surface-200">{typeof report.writingDNA.tone === 'string' ? report.writingDNA.tone : report.writingDNA.tone.primary || JSON.stringify(report.writingDNA.tone)}</p>
                    </div>
                  )}
                  {report.writingDNA.style && (
                    <div>
                      <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Writing Style</p>
                      <p className="text-sm text-surface-200">{typeof report.writingDNA.style === 'string' ? report.writingDNA.style : report.writingDNA.style.primary || JSON.stringify(report.writingDNA.style)}</p>
                    </div>
                  )}
                  {report.writingDNA.storytelling && (
                    <div>
                      <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Storytelling Pattern</p>
                      <p className="text-sm text-surface-200">{typeof report.writingDNA.storytelling === 'string' ? report.writingDNA.storytelling : report.writingDNA.storytelling.pattern || JSON.stringify(report.writingDNA.storytelling)}</p>
                    </div>
                  )}
                  {report.writingDNA.vocabulary && (
                    <div>
                      <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Vocabulary</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(report.writingDNA.vocabulary) ? report.writingDNA.vocabulary : report.writingDNA.vocabulary.keywords || []).slice(0, 8).map((w: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-white/[0.05] text-xs text-surface-300">{w}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-surface-500">Voice profile will be generated after onboarding analysis.</p>
              )}
            </div>
          </GlassCard>

          {/* Career Direction */}
          <GlassCard>
            <GlassCardHeader title="Career Direction" description="Career goals and growth opportunities" />
            <div className="space-y-4">
              {report.careerBlueprint ? (
                <>
                  {report.careerBlueprint.targetRole && (
                    <div>
                      <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Target Role</p>
                      <p className="text-sm text-surface-200">{report.careerBlueprint.targetRole}</p>
                    </div>
                  )}
                  {report.careerBlueprint.careerGoals?.length > 0 && (
                    <div>
                      <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Career Goals</p>
                      <div className="space-y-1">
                        {report.careerBlueprint.careerGoals.slice(0, 4).map((g: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-surface-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            {typeof g === 'string' ? g : g.goal || g.title || JSON.stringify(g)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.careerBlueprint.skillGaps?.length > 0 && (
                    <div>
                      <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Skill Gaps</p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.careerBlueprint.skillGaps.slice(0, 5).map((s: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-xs text-amber-400 border border-amber-500/20">
                            {typeof s === 'string' ? s : s.skill || s.name || JSON.stringify(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.careerBlueprint.suggestedTopics?.length > 0 && (
                    <div>
                      <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Suggested Content Topics</p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.careerBlueprint.suggestedTopics.slice(0, 5).map((t: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-brand-500/10 text-xs text-brand-400 border border-brand-500/20">
                            {typeof t === 'string' ? t : t.topic || t.title || JSON.stringify(t)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-surface-500">Career direction will be generated after onboarding analysis.</p>
              )}
            </div>
          </GlassCard>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StrengthAnalysis strengths={strengths} />
          <WeaknessAnalysis weaknesses={weaknesses} />
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MissingOpportunities opportunities={mappedMissingOpportunities} />
          <ContentOpportunities opportunities={mappedContentOpportunities} />
        </div>
      </StaggerItem>

      <StaggerItem>
        <Recommendations
          recommendations={mappedRecommendations}
          quickWins={quickWinRecommendations}
        />
      </StaggerItem>
    </StaggerContainer>
  );
}
