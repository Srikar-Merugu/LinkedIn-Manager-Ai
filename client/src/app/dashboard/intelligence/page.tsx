'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { ProfileSummary } from '@/components/dashboard/ProfileSummary';
import { StrengthAnalysis } from '@/components/dashboard/StrengthAnalysis';
import { WeaknessAnalysis } from '@/components/dashboard/WeaknessAnalysis';
import { MissingOpportunities } from '@/components/dashboard/MissingOpportunities';
import { ContentOpportunities } from '@/components/dashboard/ContentOpportunities';
import { Recommendations } from '@/components/dashboard/Recommendations';
import { api } from '@/lib/api';
import { cn, formatScore, getScoreColor, getScoreBgColor, getScoreBorderColor, getScoreLabel } from '@/lib/utils';

type ReportData = {
  userId: string;
  profileId: string;
  generatedAt: string;
  scores: {
    profile: { overall: number; breakdown: Array<{ label: string; score: number; maxScore: number; description?: string }> };
    branding: { overall: number; breakdown: Array<{ label: string; score: number; maxScore: number; description?: string }> };
    visibility: { overall: number; breakdown: Array<{ label: string; score: number; maxScore: number; description?: string }> };
    opportunity: { overall: number; breakdown: Array<{ label: string; score: number; maxScore: number; description?: string }> };
    contentReadiness: { overall: number; breakdown: Array<{ label: string; score: number; maxScore: number; description?: string }> };
  };
  analysis: {
    strengths: any[];
    weaknesses: any[];
    summary: string;
    careerStage: string;
    industryAlignment: number;
    skillGaps: any[];
    experienceQuality: any;
  };
  recommendations: any[];
  contentOpportunities: any[];
  missingOpportunities: any[];
};

export default function IntelligenceReportPage() {
  const { user, isAuthenticated, isLoading: isLoaded } = useAuth();
  const isSignedIn = isAuthenticated;
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('scores');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    scores: true,
    strengths: true,
    weaknesses: true,
    opportunities: true,
    content: true,
    recommendations: true,
  });

  const loadReport = useCallback(async () => {
    if (!isLoaded) return;
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const linkedinId = params.get('linkedinId');
      const token = params.get('token');

      if (linkedinId && token) {
        if (!user?.id || !isSignedIn) {
          setSyncStatus('Waiting for authentication...');
          setLoading(false);
          return;
        }
        setSyncStatus('Syncing your LinkedIn profile...');
        try {
          await api.profile.sync(user.id, token);
        } catch (syncErr) {
          setSyncStatus(null);
          setLoading(false);
          setError('Failed to sync LinkedIn profile. Please try again.');
          return;
        }
        setSyncStatus(null);
        window.history.replaceState({}, '', `/dashboard/intelligence?linkedinId=${linkedinId}`);
      }

      if (linkedinId) {
        const profile = await api.profile.getByLinkedInId(linkedinId);
        if (profile._id) {
          window.history.replaceState({}, '', `/dashboard/intelligence?profileId=${profile._id}`);
          const reportData = await api.analysis.getReport(profile._id);
          setReport(reportData);
          setLoading(false);
          return;
        }
      }

      const profileId = params.get('profileId');

      if (profileId) {
        const reportData = await api.analysis.getReport(profileId);
        setReport(reportData);
        setLoading(false);
        return;
      }

      const stateData = await api.onboarding.getState().catch(() => null);
      const linkedinProfileId = stateData?.state?.connectedSources?.linkedin?.profileId;
      if (linkedinProfileId) {
        window.history.replaceState({}, '', `/dashboard/intelligence?profileId=${linkedinProfileId}`);
        const reportData = await api.analysis.getReport(linkedinProfileId);
        setReport(reportData);
        setLoading(false);
        return;
      }

      const userProfile = await api.profile.getByUser().catch(() => null);
      if (userProfile?._id) {
        window.history.replaceState({}, '', `/dashboard/intelligence?profileId=${userProfile._id}`);
        const reportData = await api.analysis.getReport(userProfile._id);
        setReport(reportData);
        setLoading(false);
        return;
      }

      setTimeout(() => {
        setError('No LinkedIn profile connected. Please connect your profile first.');
        setLoading(false);
      }, 1000);
    } catch (err) {
      setSyncStatus(null);
      setError(err instanceof Error ? err.message : 'Failed to load intelligence report');
      setLoading(false);
    }
  }, [isLoaded, user]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">{syncStatus || 'Loading your intelligence report...'}</p>
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
          <h2 className="text-xl font-semibold text-surface-100 mb-3">
            No Profile Connected
          </h2>
          <p className="text-surface-400 mb-8 leading-relaxed">
            {error}
          </p>
          <a
            href="/dashboard"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Linkedin className="w-5 h-5" />
            Connect LinkedIn
          </a>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const scoreSections = [
    { key: 'profile', label: 'Profile Score', data: report.scores.profile, gradient: 'from-brand-500 to-brand-600' },
    { key: 'branding', label: 'Branding Score', data: report.scores.branding, gradient: 'from-accent-500 to-accent-600' },
    { key: 'visibility', label: 'Visibility Score', data: report.scores.visibility, gradient: 'from-amber-500 to-amber-600' },
    { key: 'opportunity', label: 'Opportunity Score', data: report.scores.opportunity, gradient: 'from-purple-500 to-purple-600' },
    { key: 'contentReadiness', label: 'Content Readiness', data: report.scores.contentReadiness, gradient: 'from-rose-500 to-rose-600' },
  ];

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
              {new Date(report.generatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
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
          {scoreSections.map(({ key, label, data, gradient }) => (
            <GlassCard key={key} className="text-center p-6" hover>
              <ScoreGauge
                score={data.overall}
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
                {scoreSections.map(({ key, label, data, gradient }) => (
                  <div key={key}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient}`} />
                      <h3 className="text-sm font-semibold text-surface-200">
                        {label}
                      </h3>
                      <span className={cn('text-sm font-bold', getScoreColor(data.overall))}>
                        {data.overall}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.breakdown.map((item) => (
                        <div
                          key={item.label}
                          className="glass rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-surface-400">
                              {item.label}
                            </span>
                            <span className={cn('text-xs font-bold', getScoreColor(item.score))}>
                              {item.score}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.score}%` }}
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
            {report.analysis.summary}
          </p>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StrengthAnalysis strengths={report.analysis.strengths} />
          <WeaknessAnalysis weaknesses={report.analysis.weaknesses} />
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MissingOpportunities opportunities={report.missingOpportunities} />
          <ContentOpportunities opportunities={report.contentOpportunities} />
        </div>
      </StaggerItem>

      <StaggerItem>
        <Recommendations
          recommendations={report.recommendations}
          quickWins={report.recommendations.filter(
            (r: any) => r.effort === 'low' && (r.priority === 'critical' || r.priority === 'high')
          )}
        />
      </StaggerItem>
    </StaggerContainer>
  );
}
