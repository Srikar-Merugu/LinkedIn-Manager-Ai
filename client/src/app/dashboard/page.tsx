'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Calendar, PenSquare, Send,
  ArrowRight, RefreshCw, AlertCircle, ClipboardCheck, Flame,
  Target, CheckCircle2, Clock, Zap, BookOpen, Trophy,
  TrendingDown, Minus, Activity, Award, Users, FileText,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import Link from 'next/link';

interface DashboardData {
  hasReport: boolean;
  overallScore: number;
  scores: {
    technicalLeadership: number;
    contentReadiness: number;
    industryAuthority: number;
    personalBrand: number;
    careerOpportunity: number;
  };
  streak: { current: number; longest: number; lastPublished: Date | null };
  published: { thisWeek: number; thisMonth: number; total: number; scheduled: number; drafts: number; failed: number };
  upcomingPosts: { _id: string; title: string; scheduledDate: string; contentType: string; status: string; overallScore: number }[];
  upcomingCalendar: { _id: string; date: string; topic: string; pillarName: string; status: string; hook: string }[];
  publishingQueue: { _id: string; title: string; stage: string; scheduledAt: string; overallScore: number; contentType: string }[];
  quickWins: { title: string; reason: string; priority: string; impact: string; effort: string; category: string }[];
  contentHealthScore: number;
  consistency: { postsThisWeek: number; postsLastWeek: number; recommendedFrequency: string; trend: string };
  goals: { title: string; current: number; target: number; completed: boolean }[];
  activity: { type: string; label: string; timestamp: Date }[];
  bestDay: string | null;
  bestTime: string;
  linkedinAnalysis: { connected: boolean; headline: string; skills: number; experience: number } | null;
}

const QUICK_ACTIONS = [
  { icon: BarChart3, title: 'LinkedIn Analysis', description: 'Full profile analysis', gradient: 'from-brand-500 to-brand-600', href: '/dashboard/linkedin-analysis' },
  { icon: TrendingUp, title: 'Content Strategy', description: 'Your content plan', gradient: 'from-accent-500 to-accent-600', href: '/dashboard/content-strategy' },
  { icon: PenSquare, title: 'Content Studio', description: 'Generate posts', gradient: 'from-purple-500 to-purple-600', href: '/dashboard/content-studio' },
  { icon: Send, title: 'Publishing Center', description: 'Manage workflow', gradient: 'from-green-500 to-green-600', href: '/dashboard/publishing-center' },
];

const STAGE_COLORS: Record<string, string> = {
  published: 'bg-green-500/10 text-green-400 border-green-500/20',
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  approved: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ready: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  draft_generated: 'bg-surface-500/10 text-surface-400 border-surface-500/20',
  draft: 'bg-surface-500/10 text-surface-400 border-surface-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  idea: 'bg-surface-500/10 text-surface-400 border-surface-500/20',
  planned: 'bg-surface-500/10 text-surface-400 border-surface-500/20',
};

const ACTIVITY_ICONS: Record<string, any> = {
  linkedin_connected: Users,
  github_connected: Activity,
  post_published: CheckCircle2,
  post_scheduled: Clock,
  calendar_generated: Calendar,
  google_sheet: FileText,
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.dashboard.get();
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  if (!data || !data.hasReport) {
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

  const { overallScore, scores, streak, published, upcomingPosts, upcomingCalendar, publishingQueue, quickWins, contentHealthScore, consistency, goals, activity, bestDay, bestTime, linkedinAnalysis } = data;

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Dashboard</h1>
            <p className="text-surface-400 mt-1">Your LinkedIn consistency command center</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-surface-300 hover:text-surface-100 gap-2 inline-flex items-center">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </StaggerItem>

      {/* Core Metrics */}
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
                <p className="text-2xl font-bold text-surface-100">{streak.current > 0 ? `${streak.current}d` : '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-surface-500">
              <span>Best: {streak.longest}d</span>
              {streak.lastPublished && <span>Last: {new Date(streak.lastPublished).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">Published</p>
                <p className="text-2xl font-bold text-surface-100">{published.total}</p>
              </div>
            </div>
            <p className="text-[10px] text-surface-500">{published.thisWeek} this week · {published.thisMonth} this month</p>
          </GlassCard>
          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">Upcoming</p>
                <p className="text-2xl font-bold text-surface-100">{upcomingPosts.length + upcomingCalendar.length}</p>
              </div>
            </div>
            <p className="text-[10px] text-surface-500">{published.scheduled} scheduled · {published.drafts} drafts</p>
          </GlassCard>
        </div>
      </StaggerItem>

      {/* Score Breakdown + Content Health */}
      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard className="lg:col-span-2">
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

          <GlassCard>
            <GlassCardHeader title="Content Health" description="Overall publishing health" />
            <div className="flex flex-col items-center justify-center py-4">
              <ScoreGauge score={contentHealthScore} label="Health Score" size="md" />
              <div className="mt-4 space-y-2 w-full">
                <div className="flex justify-between text-xs">
                  <span className="text-surface-400">This week</span>
                  <span className="text-surface-200 font-medium">{consistency.postsThisWeek} posts</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-surface-400">Last week</span>
                  <span className="text-surface-200 font-medium">{consistency.postsLastWeek} posts</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-surface-400">Trend</span>
                  <span className={cn('font-medium flex items-center gap-1',
                    consistency.trend === 'improving' ? 'text-green-400' :
                    consistency.trend === 'declining' ? 'text-red-400' : 'text-surface-200'
                  )}>
                    {consistency.trend === 'improving' ? <TrendingUp className="w-3 h-3" /> :
                     consistency.trend === 'declining' ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {consistency.trend}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
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

      {/* Upcoming Content + Publishing Queue */}
      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard>
            <GlassCardHeader
              title="Upcoming Content"
              description="Next scheduled posts"
              action={<Link href="/dashboard/content-calendar" className="text-xs text-brand-400 hover:text-brand-300">View All →</Link>}
            />
            {upcomingPosts.length === 0 && upcomingCalendar.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                <p className="text-sm text-surface-500">No upcoming posts. Schedule content in the Content Studio.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...upcomingPosts.map(p => ({
                  id: p._id,
                  date: p.scheduledDate,
                  title: p.title,
                  type: p.contentType,
                  status: p.status,
                })), ...upcomingCalendar.map(c => ({
                  id: c._id,
                  date: c.date,
                  title: c.topic,
                  type: c.pillarName,
                  status: c.status,
                }))].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="w-12 text-center">
                      <p className="text-[10px] text-surface-500">{new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                      <p className="text-sm font-bold text-surface-200">{new Date(item.date).getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-surface-200 truncate">{item.title}</p>
                      <p className="text-[10px] text-surface-500 truncate">{item.type}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium border capitalize', STAGE_COLORS[item.status] || 'bg-surface-500/10 text-surface-400 border-surface-500/20')}>
                      {item.status?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <GlassCardHeader
              title="Publishing Queue"
              description="Content workflow status"
              action={<Link href="/dashboard/publishing-center" className="text-xs text-brand-400 hover:text-brand-300">View All →</Link>}
            />
            {publishingQueue.length === 0 ? (
              <div className="text-center py-8">
                <Send className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                <p className="text-sm text-surface-500">No items in queue. Generate content in Content Studio.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {publishingQueue.map(item => (
                  <div key={item._id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className={cn('w-2 h-2 rounded-full',
                      item.stage === 'published' ? 'bg-green-500' :
                      item.stage === 'scheduled' ? 'bg-blue-500' :
                      item.stage === 'approved' ? 'bg-amber-500' :
                      item.stage === 'ready' ? 'bg-amber-500' : 'bg-surface-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-surface-200 truncate">{item.title}</p>
                      {item.scheduledAt && (
                        <p className="text-[10px] text-surface-500">
                          {new Date(item.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' at '}
                          {new Date(item.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium border capitalize', STAGE_COLORS[item.stage] || 'bg-surface-500/10 text-surface-400 border-surface-500/20')}>
                      {item.stage?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </StaggerItem>

      {/* Goals + Activity + Insights */}
      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard>
            <GlassCardHeader title="Goals" description="Monthly targets" />
            <div className="space-y-4">
              {goals.map((goal, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-surface-300">{goal.title}</span>
                    {goal.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <span className="text-[10px] text-surface-500">{goal.current}/{goal.target}</span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full', goal.completed ? 'bg-green-500' : 'bg-brand-500')}
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader title="Recent Activity" description="Your latest actions" />
            {activity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                <p className="text-sm text-surface-500">No activity yet. Complete onboarding to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((item, i) => {
                  const Icon = ACTIVITY_ICONS[item.type] || Activity;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-surface-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-surface-200">{item.label}</p>
                        <p className="text-[10px] text-surface-500">
                          {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <GlassCardHeader title="Consistency Insights" description="AI-powered recommendations" />
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] text-surface-500 uppercase">Posting Frequency</span>
                </div>
                <p className="text-xs text-surface-200">
                  You posted <span className="font-semibold text-white">{consistency.postsThisWeek}</span> times this week.
                  {consistency.postsThisWeek < 3 && (
                    <span className="text-surface-400"> Recommended: {consistency.recommendedFrequency}</span>
                  )}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-3.5 h-3.5 text-brand-400" />
                  <span className="text-[10px] text-surface-500 uppercase">Best Day</span>
                </div>
                <p className="text-xs text-surface-200">
                  {bestDay ? `Best posting day: ${bestDay}` : 'Publish more posts to discover your best day'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-[10px] text-surface-500 uppercase">Best Time</span>
                </div>
                <p className="text-xs text-surface-200">
                  Optimal posting time: <span className="font-semibold text-white">{bestTime}</span>
                </p>
              </div>
              {linkedinAnalysis && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] text-surface-500 uppercase">Profile Status</span>
                  </div>
                  <p className="text-xs text-surface-200">
                    {linkedinAnalysis.connected ? 'LinkedIn connected' : 'LinkedIn not connected'} · {linkedinAnalysis.skills} skills · {linkedinAnalysis.experience} roles
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </StaggerItem>

      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="AI-Generated Quick Wins" description="High-impact actions based on your data" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickWins.map((qw, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className={cn('w-3.5 h-3.5',
                      qw.priority === 'high' ? 'text-red-400' :
                      qw.priority === 'medium' ? 'text-amber-400' : 'text-surface-400'
                    )} />
                    <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium uppercase',
                      qw.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                      qw.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-surface-500/10 text-surface-400'
                    )}>
                      {qw.priority}
                    </span>
                    <span className="text-[9px] text-surface-600 uppercase">{qw.category}</span>
                  </div>
                  <p className="text-sm text-surface-200 font-medium mb-1">{qw.title}</p>
                  <p className="text-[11px] text-surface-500 mb-2">{qw.reason}</p>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-green-400">Impact: {qw.impact}</span>
                    <span className="text-surface-500">Effort: {qw.effort}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}
