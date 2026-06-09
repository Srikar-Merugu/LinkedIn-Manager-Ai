'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  TrendingUp, Target, BarChart3, Activity, Zap, Lightbulb,
  Clock, CalendarDays, Users, Award, Eye, MessageCircle,
  ChevronUp, ChevronDown, AlertTriangle, CheckCircle2,
  ArrowUp, ArrowDown, Sparkles, Brain, LineChart,
  PieChart, Flame, Star, TrendingDown,
} from 'lucide-react';

type TabId = 'overview' | 'content' | 'audience' | 'pillars' | 'opportunities' | 'career' | 'forecasts' | 'recommendations';

interface DashboardData {
  summary: { totalPosts: number; totalEngagement: number; avgEngagementRate: number; followerGrowth: number; topPostType: string; bestDay: string; score: number };
  performanceDrivers: { contentType: Array<{ type: string; avgEngagement: number; count: number }>; dayOfWeek: Array<{ day: string; avgEngagement: number; count: number }>; hourOfDay: Array<{ hour: number; avgEngagement: number; count: number }>; topTopics: Array<{ topic: string; avgEngagement: number; count: number }> };
  pillars: Array<{ pillar: string; score: number; engagement: number; posts: number; trend: string; recommendation: { action: string; rationale: string } }>;
  forecast: any;
  recommendations: any;
  report: any;
}

const tabs: Array<{ id: TabId; label: string; icon: any }> = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'content', label: 'Content DNA', icon: Brain },
  { id: 'audience', label: 'Audience', icon: Users },
  { id: 'pillars', label: 'Pillars', icon: PieChart },
  { id: 'opportunities', label: 'Opportunities', icon: Target },
  { id: 'career', label: 'Career', icon: Star },
  { id: 'forecasts', label: 'Forecasts', icon: LineChart },
  { id: 'recommendations', label: 'AI Recs', icon: Sparkles },
];

export default function GrowthIntelligencePage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [analyzing, setAnalyzing] = useState(false);

  const userId = user?.id || '';

  useEffect(() => {
    if (userId) loadDashboard();
  }, [userId]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const d = await api.analytics.getDashboard(userId);
      setData(d);
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await api.analytics.analyze(userId);
      await loadDashboard();
    } catch (e: any) {
      setError(e?.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 animate-pulse flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-surface-500">Loading growth intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400" />
          <p className="text-sm text-surface-400">{error}</p>
          <button onClick={loadDashboard} className="px-4 py-2 rounded-lg bg-brand-500/10 text-brand-400 text-xs">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Growth Intelligence</h1>
          <p className="text-sm text-surface-500">Self-improving content performance analytics</p>
        </div>
        <button onClick={handleAnalyze} disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Zap className="w-4 h-4" />
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Score Card */}
      {data?.summary && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl border border-white/5 p-6"
        >
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{data.summary.score}</span>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider">Performance Score</p>
                <p className="text-2xl font-bold text-surface-100">{data.summary.score}/100</p>
              </div>
            </div>
            <div className="h-12 w-px bg-white/5" />
            <div className="grid grid-cols-4 gap-6 flex-1">
              <MetricItem label="Posts" value={data.summary.totalPosts} icon={Activity} />
              <MetricItem label="Engagement" value={data.summary.totalEngagement.toLocaleString()} icon={MessageCircle} />
              <MetricItem label="Eng. Rate" value={`${data.summary.avgEngagementRate}%`} icon={TrendingUp} />
              <MetricItem label="Followers" value={data.summary.followerGrowth > 0 ? `+${data.summary.followerGrowth}` : `${data.summary.followerGrowth}`} icon={Users} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
              activeTab === tab.id ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-surface-500 hover:text-surface-300 border border-transparent'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'content' && <ContentDNATab data={data} />}
        {activeTab === 'audience' && <AudienceTab />}
        {activeTab === 'pillars' && <PillarsTab data={data} />}
        {activeTab === 'opportunities' && <OpportunitiesTab />}
        {activeTab === 'career' && <CareerTab />}
        {activeTab === 'forecasts' && <ForecastsTab data={data} />}
        {activeTab === 'recommendations' && <RecommendationsTab data={data} userId={userId} />}
      </div>
    </div>
  );
}

function MetricItem({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div>
      <p className="text-[10px] text-surface-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <Icon className="w-3.5 h-3.5 text-brand-400" />
        <span className="text-lg font-semibold text-surface-100">{value}</span>
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: DashboardData | null }) {
  if (!data) return null;
  const { report, recommendations } = data;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Highlights */}
      <div className="glass-card rounded-2xl border border-white/5 p-4 col-span-2">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Key Highlights</h3>
        <div className="space-y-2">
          {report?.highlights?.map((h: string, i: number) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-surface-300">{h}</p>
            </div>
          ))}
          {!report?.highlights?.length && (
            <p className="text-sm text-surface-500">Run analysis to generate insights</p>
          )}
        </div>
      </div>

      {/* Best Performers */}
      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Best Content Types</h3>
        <div className="space-y-2">
          {data.performanceDrivers?.contentType?.slice(0, 5).map((ct: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className={cn('w-1.5 h-1.5 rounded-full', i === 0 ? 'bg-brand-500' : i === 1 ? 'bg-accent-500' : 'bg-surface-500')} />
                <span className="text-xs text-surface-300 capitalize">{ct.type.replace(/_/g, ' ')}</span>
              </div>
              <span className="text-xs text-surface-500">{ct.avgEngagement} avg</span>
            </div>
          ))}
        </div>
      </div>

      {/* Best Day/Topic */}
      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Best Publishing Time</h3>
        {data.performanceDrivers?.dayOfWeek?.slice(0, 3).map((d: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] mb-1">
            <span className="text-xs text-surface-300">{d.day}</span>
            <span className="text-xs text-surface-500">{d.avgEngagement} eng</span>
          </div>
        ))}
        <p className="text-[10px] text-surface-600 mt-2">Best day: {data.summary.bestDay}</p>
      </div>

      {/* Top Topics */}
      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Top Topics</h3>
        <div className="space-y-1.5">
          {data.performanceDrivers?.topTopics?.slice(0, 5).map((t: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
              <span className="text-xs text-surface-300">{t.topic}</span>
              <span className="text-xs text-surface-500">{t.avgEngagement} eng</span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Recs */}
      {recommendations?.critical?.length > 0 && (
        <div className="glass-card rounded-2xl border border-red-500/10 p-4 col-span-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
            <AlertTriangle className="w-3.5 h-3.5" /> Critical Recommendations
          </h3>
          <div className="space-y-2">
            {recommendations.critical.map((r: any, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-surface-300 font-medium">{r.title}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContentDNATab({ data }: { data: DashboardData | null }) {
  if (!data?.recommendations) return <EmptyState />;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="glass-card rounded-2xl border border-white/5 p-4 col-span-2">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Content Type Performance</h3>
        <div className="space-y-2">
          {data.performanceDrivers?.contentType?.map((ct: any, i: number) => (
            <div key={i} className="flex items-center gap-4 p-2.5 rounded-lg bg-white/[0.02]">
              <span className="text-xs font-medium text-surface-300 w-32 capitalize">{ct.type.replace(/_/g, ' ')}</span>
              <div className="flex-1 h-2 rounded-full bg-white/[0.03] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${Math.min(100, ct.avgEngagement / 5)}%` }} />
              </div>
              <span className="text-xs text-surface-500 w-20 text-right">{ct.avgEngagement} avg</span>
              <span className="text-[10px] text-surface-600 w-16 text-right">{ct.count} posts</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Day Performance</h3>
        {data.performanceDrivers?.dayOfWeek?.map((d: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] mb-1">
            <span className="text-xs text-surface-300 w-16">{d.day.slice(0, 3)}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, d.avgEngagement / 5)}%` }} />
            </div>
            <span className="text-xs text-surface-500">{d.avgEngagement}</span>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Hour Performance</h3>
        {data.performanceDrivers?.hourOfDay?.slice(0, 5).map((h: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] mb-1">
            <span className="text-xs text-surface-300 w-12">{h.hour}:00</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
              <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.min(100, h.avgEngagement / 5)}%` }} />
            </div>
            <span className="text-xs text-surface-500">{h.avgEngagement}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AudienceTab() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      api.analytics.getAudience(user.id).then(setInsights).catch(() => {}).finally(() => setLoading(false));
    }
  }, [user?.id]);

  if (loading) return <EmptyState loading />;
  if (!insights?.analysis) return <EmptyState />;

  const { analysis } = insights;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="glass-card rounded-2xl border border-white/5 p-4 col-span-2">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Audience Segments</h3>
        <div className="grid grid-cols-2 gap-3">
          {analysis.segments?.map((seg: any, i: number) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-sm font-semibold text-surface-200 capitalize">{seg.segment.replace(/_/g, ' ')}</p>
              <p className="text-xs text-surface-500 mt-1">{seg.size} interactions</p>
              <p className="text-xs text-surface-500">Engagement: {seg.engagement}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Peak Times</h3>
        {analysis.engagementPatterns?.peakHours?.map((h: number, i: number) => (
          <div key={i} className="text-xs text-surface-300 py-1">{h}:00</div>
        ))}
        <p className="text-xs text-surface-500 mt-2">Peak days: {analysis.engagementPatterns?.peakDays?.join(', ')}</p>
      </div>

      {analysis.insights?.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/5 p-4 col-span-3">
          <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Insights</h3>
          {analysis.insights.map((ins: any, i: number) => (
            <div key={i} className={cn('flex items-start gap-2 p-2.5 rounded-lg mb-1',
              ins.impact === 'positive' ? 'bg-green-500/5 border border-green-500/10' : 'bg-amber-500/5 border border-amber-500/10'
            )}>
              {ins.impact === 'positive' ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />}
              <div>
                <p className="text-sm text-surface-300">{ins.title}</p>
                <p className="text-xs text-surface-500">{ins.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PillarsTab({ data }: { data: DashboardData | null }) {
  if (!data?.pillars?.length) return <EmptyState />;

  return (
    <div className="grid grid-cols-2 gap-4">
      {data.pillars.map((p: any, i: number) => (
        <div key={i} className="glass-card rounded-2xl border border-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-surface-200 capitalize">{p.pillar.replace(/_/g, ' ')}</h3>
            <span className={cn(
              'text-xs font-medium px-2 py-1 rounded',
              p.trend === 'up' ? 'bg-green-500/10 text-green-400' :
              p.trend === 'down' ? 'bg-red-500/10 text-red-400' : 'bg-surface-500/10 text-surface-400'
            )}>
              {p.trend === 'up' ? <ArrowUp className="w-3 h-3 inline" /> :
               p.trend === 'down' ? <ArrowDown className="w-3 h-3 inline" /> : '→'}
              {' '}{p.trend}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            <ScoreBox label="Score" value={p.score} color="brand" />
            <ScoreBox label="Engagement" value={p.engagement} color="accent" />
            <ScoreBox label="Posts" value={p.posts} color="surface" />
            <ScoreBox label="Growth" value={p.growth || 0} color={p.growth > 0 ? 'green' : 'red'} />
          </div>

          {p.recommendation && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-brand-500/5 border border-brand-500/10">
              <Lightbulb className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-surface-300 capitalize">{p.recommendation.action}:</p>
                <p className="text-[10px] text-surface-500">{p.recommendation.rationale}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ScoreBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-white/[0.02]">
      <p className="text-[9px] text-surface-600 uppercase">{label}</p>
      <p className={cn('text-sm font-semibold',
        color === 'brand' ? 'text-brand-400' :
        color === 'accent' ? 'text-accent-400' :
        color === 'green' ? 'text-green-400' :
        color === 'red' ? 'text-red-400' : 'text-surface-300'
      )}>{value}</p>
    </div>
  );
}

function OpportunitiesTab() {
  const { user } = useAuth();
  const [opps, setOpps] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      api.analytics.getOpportunities(user.id).then(setOpps).catch(() => {}).finally(() => setLoading(false));
    }
  }, [user?.id]);

  if (loading) return <EmptyState loading />;
  if (!opps) return <EmptyState />;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="glass-card rounded-2xl border border-white/5 p-4 col-span-2">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Opportunity Rankings</h3>
        <div className="space-y-2">
          {opps.ranking?.rankings?.map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  i === 0 ? 'bg-brand-500/20 text-brand-400' :
                  i === 1 ? 'bg-accent-500/20 text-accent-400' :
                  'bg-surface-500/20 text-surface-400'
                )}>#{r.rank}</span>
                <div>
                  <p className="text-xs text-surface-300 font-medium capitalize">{r.type}</p>
                  <p className="text-[10px] text-surface-500">{r.title}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-surface-300">{r.effectivenessScore}/100</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Type Performance</h3>
        {opps.byType?.map((t: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] mb-1">
            <span className="text-xs text-surface-300 capitalize">{t.type}</span>
            <span className="text-xs text-surface-500">{t.avgScore}%</span>
          </div>
        ))}
        <p className="text-xs text-surface-500 mt-2">{opps.ranking?.insight}</p>
      </div>
    </div>
  );
}

function CareerTab() {
  const { user } = useAuth();
  const [career, setCareer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      api.analytics.getCareerImpact(user.id).then(setCareer).catch(() => {}).finally(() => setLoading(false));
    }
  }, [user?.id]);

  if (loading) return <EmptyState loading />;
  if (!career?.impact) return <EmptyState />;

  const { impact } = career;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Career Impact Score</h3>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{impact.overallScore}</span>
          </div>
          <p className="text-xs text-surface-500">out of 100</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 p-4 col-span-2">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Content Contribution</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <p className="text-2xl font-bold text-surface-200">{impact.contentContribution?.totalPosts || 0}</p>
            <p className="text-[10px] text-surface-500">Total Posts</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <p className="text-2xl font-bold text-surface-200">{impact.contentContribution?.careerAlignedPosts || 0}</p>
            <p className="text-[10px] text-surface-500">Career Aligned</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <p className="text-2xl font-bold text-surface-200">{impact.contentContribution?.avgCareerAlignmentScore || 0}%</p>
            <p className="text-[10px] text-surface-500">Avg Alignment</p>
          </div>
        </div>
      </div>

      {impact.insights?.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/5 p-4 col-span-3">
          <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Insights</h3>
          {impact.insights.map((ins: any, i: number) => (
            <div key={i} className={cn('flex items-start gap-2 p-2.5 rounded-lg mb-1',
              ins.impact === 'positive' ? 'bg-green-500/5' : 'bg-amber-500/5'
            )}>
              {ins.impact === 'positive' ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />}
              <div>
                <p className="text-sm text-surface-300">{ins.title}</p>
                {ins.recommendation && <p className="text-xs text-surface-500">{ins.recommendation}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ForecastsTab({ data }: { data: DashboardData | null }) {
  const { user } = useAuth();
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      api.analytics.getForecasts(user.id, '90_days').then(setForecast).catch(() => {}).finally(() => setLoading(false));
    }
  }, [user?.id]);

  const proj = forecast?.forecast?.projections || data?.forecast?.projections;

  if (!proj) return <EmptyState />;

  const metrics = [
    { key: 'followers', label: 'Followers', icon: Users },
    { key: 'engagement', label: 'Engagement', icon: MessageCircle },
    { key: 'reach', label: 'Reach', icon: Eye },
    { key: 'opportunities', label: 'Opportunities', icon: Target },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => {
          const p = proj[m.key];
          if (!p) return null;
          return (
            <div key={m.key} className="glass-card rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-4 h-4 text-brand-400" />
                <h3 className="text-xs font-semibold text-surface-300">{m.label}</h3>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] text-surface-500">Current</span>
                  <span className="text-xs text-surface-300">{p.current?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-surface-500">Projected</span>
                  <span className="text-sm font-semibold text-brand-400">{p.projected?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-surface-500">Range</span>
                  <span className="text-[10px] text-surface-500">{p.lower?.toLocaleString()} - {p.upper?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-surface-500">Confidence</span>
                  <span className="text-[10px] text-surface-400">{p.confidence}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.03] mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${p.confidence || 50}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Predictions */}
      {forecast?.forecast?.predictions?.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/5 p-4">
          <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Predictions</h3>
          <div className="space-y-2">
            {forecast.forecast.predictions.map((p: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  p.impact === 'high' ? 'bg-brand-500/10' : 'bg-surface-500/10'
                )}>
                  <Zap className={cn('w-4 h-4', p.impact === 'high' ? 'text-brand-400' : 'text-surface-400')} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-surface-300">{p.title}</p>
                    <span className="text-xs text-surface-500">{p.probability}% probability</span>
                  </div>
                  <p className="text-xs text-surface-500 mt-1">{p.description}</p>
                  <p className="text-[10px] text-surface-600 mt-1">{p.timeframe}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {forecast?.forecast?.risks?.length > 0 && (
        <div className="glass-card rounded-2xl border border-red-500/10 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
            <AlertTriangle className="w-3.5 h-3.5" /> Risks
          </h3>
          {forecast.forecast.risks.map((r: any, i: number) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 mb-1">
              <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-surface-300">{r.risk}</p>
                <p className="text-xs text-surface-500">Mitigation: {r.mitigation}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationsTab({ data, userId }: { data: DashboardData | null; userId: string }) {
  const [recs, setRecs] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) loadRecs();
  }, [userId]);

  async function loadRecs() {
    setLoading(true);
    try {
      const r = await api.analytics.getRecommendations(userId);
      setRecs(r);
    } catch {} finally { setLoading(false); }
  }

  const allRecs = data?.recommendations || recs;

  const categories = [
    { key: 'critical', label: 'Critical', icon: Flame, color: 'red' },
    { key: 'high', label: 'High Priority', icon: ArrowUp, color: 'amber' },
    { key: 'medium', label: 'Medium', icon: Activity, color: 'brand' },
    { key: 'low', label: 'Low', icon: ArrowDown, color: 'surface' },
  ];

  return (
    <div className="space-y-4">
      {categories.map(cat => {
        const items = allRecs?.[cat.key];
        if (!items?.length) return null;
        return (
          <div key={cat.key} className="glass-card rounded-2xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <cat.icon className={cn('w-4 h-4',
                cat.color === 'red' ? 'text-red-400' :
                cat.color === 'amber' ? 'text-amber-400' :
                cat.color === 'brand' ? 'text-brand-400' : 'text-surface-400'
              )} />
              <h3 className="text-xs font-semibold text-surface-300 uppercase">{cat.label}</h3>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded',
                cat.color === 'red' ? 'bg-red-500/10 text-red-400' :
                cat.color === 'amber' ? 'bg-amber-500/10 text-amber-400' :
                cat.color === 'brand' ? 'bg-brand-500/10 text-brand-400' : 'bg-surface-500/10 text-surface-400'
              )}>{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                    cat.color === 'red' ? 'bg-red-500/10' :
                    cat.color === 'amber' ? 'bg-amber-500/10' :
                    'bg-brand-500/10'
                  )}>
                    <Lightbulb className={cn('w-4 h-4',
                      cat.color === 'red' ? 'text-red-400' :
                      cat.color === 'amber' ? 'text-amber-400' :
                      'text-brand-400'
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-surface-300">{r.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{r.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-surface-600">{r.impact?.expected}</span>
                      <span className="text-[10px] text-surface-600">{r.impact?.confidence}% confidence</span>
                      <span className="text-[10px] text-surface-600">{r.impact?.timeframe}</span>
                    </div>
                    {r.suggestedAction?.autoApply && (
                      <span className="text-[10px] text-brand-400 mt-1 inline-block">Auto-apply enabled</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {(!allRecs || (!allRecs.critical?.length && !allRecs.high?.length && !allRecs.medium?.length)) && (
        <div className="glass-card rounded-2xl border border-white/5 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-sm text-surface-400">No recommendations yet. Run analysis to generate insights.</p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ loading }: { loading?: boolean }) {
  return (
    <div className="glass-card rounded-2xl border border-white/5 p-8 text-center">
      {loading ? (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 animate-pulse mx-auto mb-3" />
      ) : (
        <Activity className="w-10 h-10 text-surface-600 mx-auto mb-3" />
      )}
      <p className="text-sm text-surface-500">{loading ? 'Loading...' : 'No data available. Publish content and run analysis.'}</p>
    </div>
  );
}
