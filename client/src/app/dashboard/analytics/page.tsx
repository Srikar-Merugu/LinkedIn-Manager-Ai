'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Activity, TrendingUp, BarChart3, Calendar, AlertTriangle,
  Loader2, CheckCircle2, ArrowUp, ArrowDown, Zap, Flame, Target,
  FileText, Send, Clock, Lightbulb, Minus,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  overview: {
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
    draftPosts: number;
    approvedPosts: number;
    avgScore: number;
  };
  consistency: {
    score: number;
    label: string;
    weeklyAvg: number;
    monthlyAvg: number;
    totalWeeks: number;
  };
  publishingHistory: { date: string; day: string; count: number }[];
  topicDistribution: { topic: string; count: number; percentage: number }[];
  streak: { current: number; longest: number; lastPostDate: string | null; daysSinceLastPost: number };
  publishingSuccess: { totalAttempts: number; published: number; failed: number; scheduled: number; successRate: number };
  contentTrends: { trend: string; message: string; scoreTrend: number; frequencyTrend: number };
  challengeProgress: any;
  recommendations: { priority: string; title: string; description: string; action: string }[];
  linkedinConnected: boolean;
}

function SectionHeader({ title, expanded, onToggle, count, icon: Icon }: {
  title: string; expanded: boolean; onToggle: () => void; count?: number; icon?: any;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between group">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="w-4 h-4 text-brand-400" />}
        <h3 className="text-sm font-semibold text-surface-100 group-hover:text-white transition-colors">{title}</h3>
        {count !== undefined && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-800 text-surface-400 font-medium">{count}</span>
        )}
      </div>
      <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronDown className="w-4 h-4 text-surface-500" />
      </motion.div>
    </button>
  );
}

function HeatmapBar({ history }: { history: { date: string; day: string; count: number }[] }) {
  const maxCount = Math.max(1, ...history.map(h => h.count));
  return (
    <div className="flex items-end gap-px h-16">
      {history.map((day, i) => (
        <motion.div key={i}
          className={cn('flex-1 rounded-t-sm transition-all',
            day.count === 0 ? 'bg-surface-800' :
            day.count === 1 ? 'bg-brand-500/30' :
            day.count === 2 ? 'bg-brand-500/50' :
            'bg-brand-500')}
          style={{ height: `${Math.max(4, (day.count / maxCount) * 100)}%` }}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(4, (day.count / maxCount) * 100)}%` }}
          transition={{ duration: 0.5, delay: i * 0.02 }}
          title={`${day.date}: ${day.count} posts`}
        />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    overview: true, consistency: true, history: true, challenge: true,
    topics: true, streak: true, success: true, trends: true, recs: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.contentAnalytics.get();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggle = (s: string) => setExpanded(prev => ({ ...prev, [s]: !prev[s] }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
        <p className="text-surface-400 text-sm">Loading analytics...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-surface-100 mb-2">Failed to Load</h2>
        <p className="text-surface-400 text-sm mb-6">{error}</p>
        <button onClick={loadData} className="btn-primary inline-flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  );

  if (!data) return null;

  const { overview, consistency, publishingHistory, topicDistribution, streak, publishingSuccess, contentTrends, challengeProgress, recommendations } = data;
  const hasData = overview.totalPosts > 0;

  return (
    <StaggerContainer className="space-y-5">
      {/* Header */}
      <StaggerItem>
        <div>
          <h1 className="text-xl font-bold text-surface-100 mb-0.5">Analytics</h1>
          <p className="text-surface-500 text-sm">Real metrics from your content activity</p>
        </div>
      </StaggerItem>

      {/* Overview Stats */}
      <StaggerItem>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: 'Total Posts', value: overview.totalPosts, icon: FileText, color: 'text-surface-200' },
            { label: 'Published', value: overview.publishedPosts, icon: Send, color: 'text-green-400' },
            { label: 'Scheduled', value: overview.scheduledPosts, icon: Clock, color: 'text-purple-400' },
            { label: 'Drafts', value: overview.draftPosts, icon: FileText, color: 'text-amber-400' },
            { label: 'Avg Score', value: overview.avgScore > 0 ? `${overview.avgScore}/100` : '—', icon: BarChart3, color: 'text-brand-400' },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
              <s.icon className={cn('w-3.5 h-3.5 mx-auto mb-0.5', s.color)} />
              <p className="text-lg font-bold text-surface-100">{s.value}</p>
              <p className="text-[9px] text-surface-500">{s.label}</p>
            </div>
          ))}
        </div>
      </StaggerItem>

      {/* 1. Content Consistency */}
      <StaggerItem>
        <GlassCard glow className="p-5">
          <SectionHeader title="Content Consistency" expanded={expanded.consistency} onToggle={() => toggle('consistency')} icon={Target} />
          <AnimatePresence>
            {expanded.consistency && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="flex items-center gap-6 mt-4">
                  <div className="relative w-20 h-20">
                    <svg width={80} height={80} className="transform -rotate-90">
                      <circle cx={40} cy={40} r={34} stroke="currentColor" strokeWidth={6} fill="none" className="text-surface-800" />
                      <motion.circle cx={40} cy={40} r={34} stroke="#6366f1" strokeWidth={6} fill="none" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 34}
                        initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - consistency.score / 100) }}
                        transition={{ duration: 1.5, ease: 'easeOut' }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-surface-100">{consistency.score}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-surface-200 mb-1">{consistency.label}</p>
                    <div className="flex items-center gap-4 text-xs text-surface-400">
                      <span>{consistency.weeklyAvg} posts/week</span>
                      <span>{consistency.monthlyAvg} posts/month</span>
                      <span>{consistency.totalWeeks} weeks active</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 2. Publishing History */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Publishing History — Last 30 days" expanded={expanded.history} onToggle={() => toggle('history')} icon={Calendar} />
          <AnimatePresence>
            {expanded.history && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="mt-4">
                  <HeatmapBar history={publishingHistory} />
                  <div className="flex justify-between mt-2 text-[9px] text-surface-600">
                    <span>30 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 3. 90 Day Challenge Progress */}
      {challengeProgress.exists && (
        <StaggerItem>
          <GlassCard className="p-5">
            <SectionHeader title="90-Day Challenge" expanded={expanded.challenge} onToggle={() => toggle('challenge')} icon={Zap} />
            <AnimatePresence>
              {expanded.challenge && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                          challengeProgress.status === 'active' ? 'bg-green-500/10 text-green-400' :
                          challengeProgress.status === 'paused' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-surface-800 text-surface-500')}>
                          {challengeProgress.status}
                        </span>
                        <span className="text-xs text-surface-400">Day {challengeProgress.currentDay} / {challengeProgress.totalDays}</span>
                      </div>
                      <span className="text-xs font-bold text-brand-400">{challengeProgress.completionPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                        initial={{ width: 0 }} animate={{ width: `${challengeProgress.completionPct}%` }}
                        transition={{ duration: 1 }} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <p className="text-sm font-bold text-surface-100">{challengeProgress.postsGenerated}</p>
                        <p className="text-[9px] text-surface-500">Generated</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <p className="text-sm font-bold text-green-400">{challengeProgress.postsPublished}</p>
                        <p className="text-[9px] text-surface-500">Published</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <p className="text-sm font-bold text-amber-400">{challengeProgress.currentStreak}d</p>
                        <p className="text-[9px] text-surface-500">Streak</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </StaggerItem>
      )}

      {/* 4. Topic Distribution */}
      {topicDistribution.length > 0 && (
        <StaggerItem>
          <GlassCard className="p-5">
            <SectionHeader title="Topic Distribution" expanded={expanded.topics} onToggle={() => toggle('topics')} icon={BarChart3}
              count={topicDistribution.length} />
            <AnimatePresence>
              {expanded.topics && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="space-y-2 mt-4">
                    {topicDistribution.map((topic, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3">
                        <span className="text-xs text-surface-300 w-28 truncate capitalize">{topic.topic}</span>
                        <div className="flex-1 h-2 rounded-full bg-surface-800 overflow-hidden">
                          <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                            initial={{ width: 0 }} animate={{ width: `${topic.percentage}%` }}
                            transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }} />
                        </div>
                        <span className="text-[10px] text-surface-500 w-12 text-right">{topic.count} ({topic.percentage}%)</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </StaggerItem>
      )}

      {/* 5. Posting Streak */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Posting Streak" expanded={expanded.streak} onToggle={() => toggle('streak')} icon={Flame} />
          <AnimatePresence>
            {expanded.streak && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <Flame className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-surface-100">{streak.current}</p>
                    <p className="text-[10px] text-surface-500">Current Streak</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-surface-100">{streak.longest}</p>
                    <p className="text-[10px] text-surface-500">Longest Streak</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-surface-100">{streak.daysSinceLastPost ?? '—'}</p>
                    <p className="text-[10px] text-surface-500">Days Since Last Post</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 6. Publishing Success Rate */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Publishing Success Rate" expanded={expanded.success} onToggle={() => toggle('success')} icon={CheckCircle2} />
          <AnimatePresence>
            {expanded.success && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="mt-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-surface-400">Success Rate</span>
                        <span className="text-xs font-bold text-green-400">{publishingSuccess.successRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                          initial={{ width: 0 }} animate={{ width: `${publishingSuccess.successRate}%` }}
                          transition={{ duration: 1 }} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white/[0.02]">
                      <p className="text-sm font-bold text-surface-100">{publishingSuccess.totalAttempts}</p>
                      <p className="text-[9px] text-surface-500">Total</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02]">
                      <p className="text-sm font-bold text-green-400">{publishingSuccess.published}</p>
                      <p className="text-[9px] text-surface-500">Published</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02]">
                      <p className="text-sm font-bold text-purple-400">{publishingSuccess.scheduled}</p>
                      <p className="text-[9px] text-surface-500">Scheduled</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02]">
                      <p className="text-sm font-bold text-red-400">{publishingSuccess.failed}</p>
                      <p className="text-[9px] text-surface-500">Failed</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 7. Content Trends */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Content Trends" expanded={expanded.trends} onToggle={() => toggle('trends')} icon={TrendingUp} />
          <AnimatePresence>
            {expanded.trends && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    {contentTrends.trend === 'improving' ? <ArrowUp className="w-4 h-4 text-green-400" /> :
                     contentTrends.trend === 'declining' ? <ArrowDown className="w-4 h-4 text-red-400" /> :
                     <Minus className="w-4 h-4 text-surface-400" />}
                    <span className={cn('text-sm font-semibold',
                      contentTrends.trend === 'improving' ? 'text-green-400' :
                      contentTrends.trend === 'declining' ? 'text-red-400' :
                      'text-surface-300')}>
                      {contentTrends.trend === 'improving' ? 'Improving' :
                       contentTrends.trend === 'declining' ? 'Declining' :
                       contentTrends.trend === 'accelerating' ? 'Accelerating' :
                       contentTrends.trend === 'decelerating' ? 'Decelerating' :
                       'Stable'}
                    </span>
                  </div>
                  <p className="text-xs text-surface-400">{contentTrends.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 8. AI Recommendations */}
      {recommendations.length > 0 && (
        <StaggerItem>
          <GlassCard className="p-5">
            <SectionHeader title="AI Recommendations" expanded={expanded.recs} onToggle={() => toggle('recs')} icon={Lightbulb}
              count={recommendations.length} />
            <AnimatePresence>
              {expanded.recs && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="space-y-2 mt-4">
                    {recommendations.map((rec, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                          rec.priority === 'high' ? 'bg-red-500/10' : rec.priority === 'medium' ? 'bg-amber-500/10' : 'bg-blue-500/10')}>
                          <Lightbulb className={cn('w-3.5 h-3.5',
                            rec.priority === 'high' ? 'text-red-400' : rec.priority === 'medium' ? 'text-amber-400' : 'text-blue-400')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium text-surface-200">{rec.title}</p>
                            <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                              rec.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                              rec.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                              'bg-blue-500/10 text-blue-400')}>
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-surface-500">{rec.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </StaggerItem>
      )}

      {/* Empty State */}
      {!hasData && (
        <StaggerItem>
          <GlassCard className="p-8 text-center">
            <Activity className="w-10 h-10 text-surface-600 mx-auto mb-3" />
            <h2 className="text-sm font-semibold text-surface-300 mb-1">No content data yet</h2>
            <p className="text-xs text-surface-500 mb-4">Start creating posts to see real analytics</p>
            <a href="/dashboard/content-studio" className="btn-primary text-sm inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Start Creating
            </a>
          </GlassCard>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}
