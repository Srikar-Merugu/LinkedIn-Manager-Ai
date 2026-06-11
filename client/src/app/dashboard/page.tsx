'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Calendar, PenSquare, Send,
  ArrowRight, RefreshCw, AlertCircle, ClipboardCheck, Flame,
  Target, CheckCircle2,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import Link from 'next/link';

interface Report {
  scores: {
    technicalLeadership: number;
    contentReadiness: number;
    industryAuthority: number;
    personalBrand: number;
    careerOpportunity: number;
  };
  contentPillars?: any[];
  strategy90Days?: any;
  quickWins?: any[];
  brandDNA?: any;
  writingDNA?: any;
  careerBlueprint?: any;
  [key: string]: any;
}

interface CalendarEntry {
  _id: string;
  date: string;
  topic: string;
  pillarName: string;
  status: string;
  hook: string;
}

interface QueueItem {
  _id: string;
  topic: string;
  status: string;
}

const QUICK_ACTIONS = [
  { icon: BarChart3, title: 'LinkedIn Analysis', description: 'Full profile analysis', gradient: 'from-brand-500 to-brand-600', href: '/dashboard/linkedin-analysis' },
  { icon: TrendingUp, title: 'Content Strategy', description: 'Your content plan', gradient: 'from-accent-500 to-accent-600', href: '/dashboard/content-strategy' },
  { icon: PenSquare, title: 'Content Studio', description: 'Generate posts', gradient: 'from-purple-500 to-purple-600', href: '/dashboard/content-studio' },
  { icon: Send, title: 'Publishing Center', description: 'Manage workflow', gradient: 'from-green-500 to-green-600', href: '/dashboard/publishing-center' },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const reportData = await api.report.get();
      setReport(reportData ?? null);

      if (reportData) {
        const [calendarData, queueData] = await Promise.allSettled([
          api.contentOperations.getCalendar(reportData.userId || ''),
          api.contentOperations.getQueue(reportData.userId || ''),
        ]);
        if (calendarData.status === 'fulfilled') setCalendarEntries(calendarData.value || []);
        if (queueData.status === 'fulfilled') setQueueItems(queueData.value || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-2">Something went wrong</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 gap-2 inline-flex items-center">
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full">
          <GlassCard glow className="text-center p-12">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto mb-8">
              <ClipboardCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-surface-100 mb-3">Complete Your Onboarding</h1>
            <p className="text-surface-400 mb-8 leading-relaxed">
              Finish your onboarding to unlock your personalized LinkedIn consistency coach.
            </p>
            <Link href="/onboarding" className="px-6 py-3 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 inline-flex items-center gap-2">
              Go to Onboarding <ArrowRight className="w-4 h-4" />
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  const scores = report.scores || {};
  const overallScore = Math.round(
    ((scores.technicalLeadership || 0) + (scores.contentReadiness || 0) + (scores.industryAuthority || 0) + (scores.personalBrand || 0) + (scores.careerOpportunity || 0)) / 5
  );

  const publishedCount = queueItems.filter(q => q.status === 'published').length;
  const scheduledCount = queueItems.filter(q => q.status === 'scheduled').length;
  const draftCount = queueItems.filter(q => q.status === 'draft').length;
  const readyCount = queueItems.filter(q => q.status === 'ready').length;

  const upcomingEntries = calendarEntries
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const recentEntries = calendarEntries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Dashboard</h1>
            <p className="text-surface-400 mt-1">Your LinkedIn consistency overview</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-surface-300 hover:text-surface-100 gap-2 inline-flex items-center">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </StaggerItem>

      {/* Consistency Score + Key Metrics */}
      <StaggerItem>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-6 text-center" hover>
            <ScoreGauge score={overallScore} label="Overall Score" size="sm" />
          </GlassCard>
          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">Posting Streak</p>
                <p className="text-2xl font-bold text-surface-100">—</p>
              </div>
            </div>
            <p className="text-[10px] text-surface-500">Start publishing to build your streak</p>
          </GlassCard>
          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">Published</p>
                <p className="text-2xl font-bold text-surface-100">{publishedCount}</p>
              </div>
            </div>
            <p className="text-[10px] text-surface-500">{scheduledCount} scheduled, {draftCount} drafts</p>
          </GlassCard>
          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">Upcoming Posts</p>
                <p className="text-2xl font-bold text-surface-100">{upcomingEntries.length}</p>
              </div>
            </div>
            <p className="text-[10px] text-surface-500">{calendarEntries.length} total in calendar</p>
          </GlassCard>
        </div>
      </StaggerItem>

      {/* Score Breakdown */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Score Breakdown" description="Your LinkedIn presence dimensions" />
          <div className="grid grid-cols-5 gap-3">
            {[
              { key: 'technicalLeadership', label: 'Technical', score: scores.technicalLeadership || 0 },
              { key: 'contentReadiness', label: 'Content', score: scores.contentReadiness || 0 },
              { key: 'industryAuthority', label: 'Authority', score: scores.industryAuthority || 0 },
              { key: 'personalBrand', label: 'Brand', score: scores.personalBrand || 0 },
              { key: 'careerOpportunity', label: 'Career', score: scores.careerOpportunity || 0 },
            ].map(item => (
              <div key={item.key} className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <ScoreGauge score={item.score} label={item.label} size="sm" />
              </div>
            ))}
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Quick Actions */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Quick Actions" description="Jump to key features" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(action => (
              <Link key={action.title} href={action.href}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-surface-100 mb-1">{action.title}</h3>
                <p className="text-xs text-surface-500">{action.description}</p>
                <ArrowRight className="w-4 h-4 text-surface-500 mt-2 group-hover:text-brand-400 transition-colors" />
              </Link>
            ))}
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Content Calendar Preview + Queue */}
      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Calendar */}
          <GlassCard>
            <GlassCardHeader
              title="Upcoming Content"
              description="Next scheduled posts"
              action={<Link href="/dashboard/content-calendar" className="text-xs text-brand-400 hover:text-brand-300">View All →</Link>}
            />
            {upcomingEntries.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                <p className="text-sm text-surface-500">No upcoming posts. Create a content strategy first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEntries.map(entry => (
                  <div key={entry._id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="w-12 text-center">
                      <p className="text-[10px] text-surface-500">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                      <p className="text-sm font-bold text-surface-200">{new Date(entry.date).getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-surface-200 truncate">{entry.topic}</p>
                      <p className="text-[10px] text-surface-500 truncate">{entry.hook}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.05] text-surface-400 capitalize">
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Publishing Queue */}
          <GlassCard>
            <GlassCardHeader
              title="Publishing Queue"
              description="Content ready for review"
              action={<Link href="/dashboard/publishing-center" className="text-xs text-brand-400 hover:text-brand-300">View All →</Link>}
            />
            {queueItems.length === 0 ? (
              <div className="text-center py-8">
                <Send className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                <p className="text-sm text-surface-500">No items in queue. Generate content in Content Studio.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {queueItems.slice(0, 5).map(item => (
                  <div key={item._id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className={cn('w-2 h-2 rounded-full',
                      item.status === 'published' ? 'bg-green-500' :
                      item.status === 'scheduled' ? 'bg-blue-500' :
                      item.status === 'ready' ? 'bg-amber-500' : 'bg-surface-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-surface-200 truncate">{item.topic}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.05] text-surface-400 capitalize">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </StaggerItem>

      {/* Recommendations */}
      {report.quickWins && report.quickWins.length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Quick Wins" description="High-impact actions you can take now" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {report.quickWins.slice(0, 6).map((qw: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-3.5 h-3.5 text-brand-400" />
                    <span className="text-[10px] text-surface-500 uppercase">{qw.category}</span>
                  </div>
                  <p className="text-sm text-surface-200 font-medium">{qw.action}</p>
                  <p className="text-xs text-surface-500 mt-1">{qw.impact}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}
