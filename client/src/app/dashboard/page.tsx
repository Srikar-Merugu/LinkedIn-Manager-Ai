'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Lightbulb,
  Target,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { MotionDiv, StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import Link from 'next/link';

interface AnalysisReport {
  scores: {
    technicalLeadership: number;
    contentReadiness: number;
    industryAuthority: number;
    personalBrand: number;
    careerOpportunity: number;
  };
  profileSummary?: string;
  brandDNA?: {
    archetype?: string;
    voice?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

const SCORE_CONFIG = [
  { key: 'technicalLeadership', label: 'Technical Leadership', color: 'from-brand-500 to-brand-600' },
  { key: 'contentReadiness', label: 'Content Readiness', color: 'from-accent-500 to-accent-600' },
  { key: 'industryAuthority', label: 'Industry Authority', color: 'from-amber-500 to-amber-600' },
  { key: 'personalBrand', label: 'Personal Brand', color: 'from-purple-500 to-purple-600' },
  { key: 'careerOpportunity', label: 'Career Opportunity', color: 'from-rose-500 to-rose-600' },
] as const;

const QUICK_ACTIONS = [
  {
    icon: BarChart3,
    title: 'View Intelligence Report',
    description: 'Full analysis of your profile',
    gradient: 'from-brand-500 to-brand-600',
    href: '/dashboard/intelligence',
  },
  {
    icon: Lightbulb,
    title: 'Review Recommendations',
    description: 'Personalized action items',
    gradient: 'from-accent-500 to-accent-600',
    href: '/dashboard/recommendations',
  },
  {
    icon: Target,
    title: 'Explore Opportunities',
    description: 'Content & growth opportunities',
    gradient: 'from-purple-500 to-purple-600',
    href: '/dashboard/opportunities',
  },
] as const;

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.report.get();
      setReport(data ?? null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load your analysis report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-4 w-72" />
          </div>
          <div className="skeleton h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button
            onClick={fetchReport}
            className="btn-primary gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <MotionDiv direction="up" className="max-w-md w-full">
          <GlassCard glow className="text-center p-12">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto mb-8">
              <ClipboardCheck className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-surface-100 mb-3">
              Complete Your Onboarding
            </h1>
            <p className="text-surface-400 mb-8 leading-relaxed">
              Finish your onboarding to unlock your full LinkedIn intelligence
              report with personalized scores and recommendations.
            </p>

            <Link
              href="/onboarding"
              className="btn-primary inline-flex items-center gap-2"
            >
              Go to Onboarding
              <ArrowRight className="w-4 h-4" />
            </Link>
          </GlassCard>
        </MotionDiv>
      </div>
    );
  }

  const { scores, profileSummary, brandDNA } = report;
  const summaryText = profileSummary || brandDNA?.archetype
    ? `${brandDNA?.archetype ? `Archetype: ${brandDNA.archetype}. ` : ''}${profileSummary || ''}`
    : null;

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Dashboard</h1>
            <p className="text-surface-400 mt-1">
              Your LinkedIn intelligence overview
            </p>
          </div>
          <button
            onClick={fetchReport}
            className="btn-secondary gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {SCORE_CONFIG.map((item) => (
            <GlassCard key={item.key} className="text-center p-6" hover>
              <ScoreGauge
                score={scores[item.key] ?? 0}
                label={item.label}
                size="sm"
              />
            </GlassCard>
          ))}
        </div>
      </StaggerItem>

      {summaryText && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader
              title="Profile Summary"
              description="Your LinkedIn brand at a glance"
            />
            <p className="text-surface-300 text-sm leading-relaxed">
              {summaryText}
            </p>
          </GlassCard>
        </StaggerItem>
      )}

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader
            title="Quick Actions"
            description="Start with these high-impact tasks"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="glass rounded-xl p-5 glass-hover group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-surface-100 mb-1">
                  {action.title}
                </h3>
                <p className="text-xs text-surface-500">
                  {action.description}
                </p>
                <ArrowRight className="w-4 h-4 text-surface-500 mt-3 group-hover:text-brand-400 transition-colors" />
              </Link>
            ))}
          </div>
        </GlassCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
