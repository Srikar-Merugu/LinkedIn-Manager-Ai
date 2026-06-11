'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Activity, TrendingUp, BarChart3, Calendar, AlertTriangle,
  Loader2, CheckCircle2, ArrowUp, ArrowDown,
  MessageCircle, Users, Zap,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalPosts: number;
    totalEngagement: number;
    avgEngagementRate: number;
    followerGrowth: number;
    topPostType: string;
    bestDay: string;
    score: number;
  };
  performanceDrivers: {
    contentType: Array<{ type: string; avgEngagement: number; count: number }>;
    dayOfWeek: Array<{ day: string; avgEngagement: number; count: number }>;
    topTopics: Array<{ topic: string; avgEngagement: number; count: number }>;
  };
  pillars: Array<{
    pillar: string;
    score: number;
    engagement: number;
    posts: number;
    trend: string;
    recommendation: { action: string; rationale: string };
  }>;
  report: any;
  recommendations: any;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const userId = user?.id || '';

  const loadAnalytics = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await api.analytics.getDashboard(userId);
      setData(d);
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await api.analytics.analyze(userId);
      await loadAnalytics();
    } catch { /* ignore */ }
    setAnalyzing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-3">Failed to Load Analytics</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button onClick={loadAnalytics} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const pillars = data?.pillars || [];
  const contentTypes = data?.performanceDrivers?.contentType || [];
  const topTopics = data?.performanceDrivers?.topTopics || [];
  const highlights = data?.report?.highlights || [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Analytics</h1>
          <p className="text-sm text-surface-500 mt-1">Track your consistency and content performance</p>
        </div>
        <button onClick={handleAnalyze} disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Zap className="w-4 h-4" />
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </motion.div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Performance Score', value: `${summary.score}/100`, icon: BarChart3, color: 'text-brand-400' },
            { label: 'Total Posts', value: summary.totalPosts, icon: Activity, color: 'text-surface-200' },
            { label: 'Total Engagement', value: summary.totalEngagement?.toLocaleString() || '0', icon: MessageCircle, color: 'text-surface-200' },
            { label: 'Avg Engagement Rate', value: `${summary.avgEngagementRate || 0}%`, icon: TrendingUp, color: summary.avgEngagementRate > 3 ? 'text-green-400' : 'text-amber-400' },
            { label: 'Follower Growth', value: summary.followerGrowth > 0 ? `+${summary.followerGrowth}` : `${summary.followerGrowth || 0}`, icon: Users, color: (summary.followerGrowth || 0) > 0 ? 'text-green-400' : 'text-red-400' },
          ].map(card => (
            <div key={card.label} className="glass-card rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={cn('w-4 h-4', card.color)} />
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">{card.label}</p>
              </div>
              <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content Pillar Performance */}
      {pillars.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Pillar Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pillars.map((p, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-surface-200 capitalize">{p.pillar?.replace(/_/g, ' ')}</h4>
                  <span className={cn('flex items-center gap-1 text-xs',
                    p.trend === 'up' ? 'text-green-400' : p.trend === 'down' ? 'text-red-400' : 'text-surface-400'
                  )}>
                    {p.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : p.trend === 'down' ? <ArrowDown className="w-3 h-3" /> : '→'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <p className="text-[9px] text-surface-600 uppercase">Score</p>
                    <p className="text-sm font-semibold text-brand-400">{p.score}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-surface-600 uppercase">Engagement</p>
                    <p className="text-sm font-semibold text-accent-400">{p.engagement}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-surface-600 uppercase">Posts</p>
                    <p className="text-sm font-semibold text-surface-300">{p.posts}</p>
                  </div>
                </div>
                {p.recommendation && (
                  <div className="p-2 rounded-lg bg-brand-500/5 border border-brand-500/10">
                    <p className="text-[10px] text-brand-400 font-medium">{p.recommendation.action}</p>
                    <p className="text-[9px] text-surface-500 mt-0.5">{p.recommendation.rationale}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Type Performance */}
      {contentTypes.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Content Type Performance</h3>
          <div className="space-y-2">
            {contentTypes.slice(0, 6).map((ct, i) => (
              <div key={i} className="flex items-center gap-4 p-2.5 rounded-lg bg-white/[0.02]">
                <span className="text-xs font-medium text-surface-300 w-32 capitalize">{ct.type.replace(/_/g, ' ')}</span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.03] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                    style={{ width: `${Math.min(100, (ct.avgEngagement || 0) / 5)}%` }} />
                </div>
                <span className="text-xs text-surface-500 w-20 text-right">{ct.avgEngagement} avg</span>
                <span className="text-[10px] text-surface-600 w-16 text-right">{ct.count} posts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Highlights */}
      {highlights.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Key Insights</h3>
          <div className="space-y-2">
            {highlights.slice(0, 5).map((h: string, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-surface-300">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Topics */}
      {topTopics.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Top Topics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {topTopics.slice(0, 6).map((t, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]">
                <span className="text-xs text-surface-300">{t.topic}</span>
                <span className="text-xs text-surface-500">{t.avgEngagement} eng</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Day */}
      {summary?.bestDay && (
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Best Publishing Day</h3>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-400" />
            <p className="text-lg font-semibold text-surface-200">{summary.bestDay}</p>
            <p className="text-xs text-surface-500">— highest average engagement</p>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="glass-card rounded-2xl p-12 border border-white/5 text-center">
          <Activity className="w-12 h-12 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-400 text-sm mb-4">No analytics data yet. Run analysis to generate insights.</p>
          <button onClick={handleAnalyze} disabled={analyzing}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      )}
    </div>
  );
}

function Lightbulb(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}
