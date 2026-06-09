'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  ListTodo,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Clock,
  Settings2,
  Upload,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const stageColors: Record<string, string> = {
  idea: 'bg-gray-500/20 text-gray-400',
  planned: 'bg-blue-500/20 text-blue-400',
  draft_generated: 'bg-amber-500/20 text-amber-400',
  ready: 'bg-cyan-500/20 text-cyan-400',
  approved: 'bg-green-500/20 text-green-400',
  scheduled: 'bg-purple-500/20 text-purple-400',
  published: 'bg-emerald-500/20 text-emerald-400',
  analyzed: 'bg-violet-500/20 text-violet-400',
  archived: 'bg-gray-500/10 text-gray-500',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  review: 'bg-amber-500/20 text-amber-400',
  approved: 'bg-green-500/20 text-green-400',
  scheduled: 'bg-purple-500/20 text-purple-400',
  published: 'bg-emerald-500/20 text-emerald-400',
  failed: 'bg-red-500/20 text-red-400',
  archived: 'bg-gray-500/10 text-gray-500',
};

export default function ContentOperationsPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [calendarEntries, setCalendarEntries] = useState<any[]>([]);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [publishingMode, setPublishingMode] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [syncingToSheets, setSyncingToSheets] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stateRes = await api.onboarding.getState();
        const uid = stateRes.state.userId;
        setUserId(uid);

        const st = await api.contentOperations.getStatus(uid);
        setStatus(st);

        if (st.calendar.hasEntries) {
          const entries = await api.contentOperations.getCalendar(uid, '', '', '', '');
          setCalendarEntries(entries);
          const queue = await api.contentOperations.getQueue(uid);
          setQueueItems(queue);
        }

        try {
          const mode = await api.contentOperations.getMode(uid);
          setPublishingMode(mode);
        } catch {}
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleGenerate = async () => {
    if (!userId) return;
    setGenerating(true);
    setError(null);
    try {
      const stateRes = await api.onboarding.getState();
      const state = stateRes.state;
      const linkedin = state.connectedSources?.linkedin?.profileData || {};
      const resume = state.connectedSources?.resume?.parsedData || {};
      const brandDna = state.brandDNA || {};
      const writingDna = state.writingDNA || {};
      const careerGoal = state.careerGoal || {};

      const strategyData = {
        overallStrategy: {
          monthlyPlans: [
            { monthNumber: 1, phase: 'positioning', contentMix: [{ type: 'story', percentage: 30 }, { type: 'educational', percentage: 25 }, { type: 'personal', percentage: 25 }, { type: 'promotional', percentage: 20 }], weeklyThemes: [1, 2, 3, 4] },
            { monthNumber: 2, phase: 'authority', contentMix: [{ type: 'educational', percentage: 30 }, { type: 'engagement', percentage: 25 }, { type: 'personal', percentage: 20 }, { type: 'promotional', percentage: 25 }], weeklyThemes: [5, 6, 7, 8] },
            { monthNumber: 3, phase: 'opportunity', contentMix: [{ type: 'engagement', percentage: 30 }, { type: 'story', percentage: 25 }, { type: 'educational', percentage: 25 }, { type: 'promotional', percentage: 20 }], weeklyThemes: [9, 10, 11, 12] },
          ],
        },
        weeklyThemes: Array.from({ length: 12 }, (_, i) => ({
          globalWeekNumber: i + 1,
          title: `Week ${i + 1} Theme`,
          focus: 'Professional Growth',
          description: 'Content aligned with career goals',
          contentIdeas: ['Share your expertise', 'Industry insights', 'Personal journey'],
          pillarFocus: ['Career Growth', 'Professional Development'],
          contentTypeMix: [{ type: 'Post', count: 3 }, { type: 'Engagement', count: 5 }],
        })),
        growthGoals: [
          { category: 'audience', goal: 'Build engaged audience', successMetrics: ['Followers', 'Engagement'] },
          { category: 'authority', goal: 'Establish thought leadership', successMetrics: ['Saves', 'Shares'] },
        ],
        careerGoal,
        authorityTopics: (linkedin.skills || []).slice(0, 5).map((s: any) => s.name),
        brandDNA: brandDna,
        writingDNA: writingDna,
        skills: linkedin.skills || resume.skills || [],
        experience: linkedin.experience || resume.experience || [],
      };

      const result = await api.contentOperations.generateFullReport(userId, strategyData);
      setReport(result);

      const entries = await api.contentOperations.getCalendar(userId, '', '', '', '');
      setCalendarEntries(entries);
      const queue = await api.contentOperations.getQueue(userId);
      setQueueItems(queue);

      const st = await api.contentOperations.getStatus(userId);
      setStatus(st);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleAdvance = async (queueId: string) => {
    try {
      const result = await api.contentOperations.advanceQueue(queueId);
      const queue = await api.contentOperations.getQueue(userId!);
      setQueueItems(queue);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSyncToSheets = async () => {
    if (!userId) return;
    setSyncingToSheets(true);
    try {
      const result = await api.contentOperations.syncToSheets(userId);
      setReport((prev: any) => ({ ...prev, sheets: result.result }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncingToSheets(false);
    }
  };

  const handleModeChange = async (mode: string) => {
    if (!userId) return;
    try {
      const result = await api.contentOperations.updateMode(userId, mode);
      setPublishingMode(result);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLoadAnalytics = async () => {
    if (!userId) return;
    try {
      const feedback = await api.contentOperations.getAnalytics(userId);
      setAnalytics(feedback);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const today = new Date();
  const currentMonthEntries = calendarEntries.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(today);
  const firstDay = getFirstDayOfMonth(today);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const queueByStage: Record<string, any[]> = {};
  const stages = ['idea', 'planned', 'draft_generated', 'ready', 'approved', 'scheduled', 'published'];
  for (const stage of stages) {
    queueByStage[stage] = queueItems.filter((q: any) => q.stage === stage);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Content Operations
          </h1>
          <p className="text-gray-400 mt-1">Content Operating System — calendar, queue, pipeline, and automation</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncToSheets}
            disabled={syncingToSheets || !status?.calendar?.hasEntries}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-50 transition-all"
          >
            <Upload className={cn('w-4 h-4', syncingToSheets && 'animate-spin')} />
            Sync Sheets
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !userId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Generate Calendar'}
          </button>
        </div>
      </div>

      {error && (
        <GradientBorder className="border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 p-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        </GradientBorder>
      )}

      {/* Status Cards */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <GradientBorder>
            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                  <CalendarDays className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Calendar Entries</p>
                  <p className="text-2xl font-bold">{status?.calendar?.total || 0}</p>
                  <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                    {Object.entries(status?.calendar?.byStatus || {}).map(([s, c]: [string, any]) => (
                      <span key={s} className={cn('px-1.5 py-0.5 rounded', statusColors[s] || '')}>{c} {s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </GradientBorder>
        </StaggerItem>
        <StaggerItem>
          <GradientBorder>
            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                  <ListTodo className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Queue Items</p>
                  <p className="text-2xl font-bold">{status?.queue?.total || 0}</p>
                </div>
              </div>
            </GlassCard>
          </GradientBorder>
        </StaggerItem>
        <StaggerItem>
          <GradientBorder>
            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                  <Settings2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Publishing Mode</p>
                  <p className="text-lg font-bold capitalize">{publishingMode?.mode || 'manual'}</p>
                </div>
              </div>
            </GlassCard>
          </GradientBorder>
        </StaggerItem>
        <StaggerItem>
          <GradientBorder>
            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Snapshot</p>
                  <p className="text-lg font-bold">v{status?.snapshot?.version || '-'}</p>
                  <p className="text-xs text-gray-500">{status?.snapshot?.totalEntries || 0} entries</p>
                </div>
              </div>
            </GlassCard>
          </GradientBorder>
        </StaggerItem>
      </StaggerContainer>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {[
          { id: 'calendar', label: 'Calendar', icon: CalendarDays },
          { id: 'queue', label: 'Queue', icon: ListTodo },
          { id: 'pipeline', label: 'Pipeline', icon: BarChart3 },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: Settings2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div>
          {calendarEntries.length === 0 && !generating && (
            <GlassCard>
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 text-cyan-400/50" />
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No Calendar Entries</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-4">Generate your content calendar to see 90 days of planned posts here.</p>
                <button onClick={handleGenerate} disabled={generating} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium disabled:opacity-50">
                  {generating ? 'Generating...' : 'Generate Calendar'}
                </button>
              </div>
            </GlassCard>
          )}

          {calendarEntries.length > 0 && (
            <GlassCard>
              <GlassCardHeader title={`${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`} description={`${currentMonthEntries.length} entries this month`} />
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map(d => (
                  <div key={d} className="text-xs text-gray-500 text-center py-2 font-medium">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 rounded-lg bg-white/[0.02]" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayEntries = calendarEntries.filter(e => e.date?.startsWith(dateStr));
                  const isToday = day === today.getDate();

                  return (
                    <div
                      key={day}
                      className={cn(
                        'h-24 rounded-lg p-1.5 border transition-all overflow-hidden',
                        isToday ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/5 hover:border-white/10 bg-white/[0.02]'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-xs font-medium', isToday ? 'text-cyan-400' : 'text-gray-400')}>{day}</span>
                        {dayEntries.length > 0 && (
                          <span className="text-[10px] text-gray-500">{dayEntries.length}</span>
                        )}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayEntries.slice(0, 2).map((entry: any, idx: number) => (
                          <div key={idx} className={cn(
                            'text-[10px] px-1 py-0.5 rounded truncate',
                            statusColors[entry.status] || 'bg-gray-500/20 text-gray-400'
                          )}>
                            {entry.topic?.slice(0, 20)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div>
          {queueItems.length === 0 && !generating && (
            <GlassCard>
              <div className="text-center py-12">
                <ListTodo className="w-12 h-12 mx-auto mb-4 text-cyan-400/50" />
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Queue Empty</h3>
                <p className="text-gray-500">Generate your calendar to populate the content queue.</p>
              </div>
            </GlassCard>
          )}

          {queueItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {stages.map(stage => {
                const items = queueByStage[stage] || [];
                return (
                  <div key={stage}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', stageColors[stage] || 'bg-gray-500/20 text-gray-400')}>
                        {stage.replace('_', ' ')} ({items.length})
                      </div>
                    </div>
                    <div className="space-y-2">
                      {items.slice(0, 8).map((item: any) => (
                        <GlassCard key={item._id} className="cursor-pointer hover:bg-white/[0.04] transition-all">
                          <p className="text-xs font-medium text-gray-200 truncate">{item.calendarEntryId?.topic || 'Untitled'}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-gray-500">P{item.priority > 75 ? 1 : item.priority > 50 ? 2 : 3}</span>
                            {item.dueDate && (
                              <span className="text-[10px] text-gray-500">
                                {new Date(item.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleAdvance(item._id)}
                            className="mt-2 w-full text-[10px] px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                          >
                            Advance
                          </button>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <StaggerContainer className="space-y-4">
          <GlassCard>
            <GlassCardHeader title="Publishing Pipeline" description="Content lifecycle from idea to published" />
            <div className="space-y-3 mt-4">
              {['idea', 'planned', 'draft_generated', 'ready', 'approved', 'scheduled', 'published'].map((stage, idx) => {
                const count = queueByStage[stage]?.length || 0;
                const total = queueItems.length || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', stage === 'published' ? 'bg-emerald-500' : stage === 'scheduled' ? 'bg-purple-500' : stage === 'approved' ? 'bg-green-500' : 'bg-gray-500')} />
                        <span className="text-sm text-gray-300 capitalize">{stage.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{count}</span>
                        <span className="text-xs text-gray-500">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          stage === 'published' ? 'bg-emerald-500' :
                          stage === 'scheduled' ? 'bg-purple-500' :
                          stage === 'approved' ? 'bg-green-500' :
                          stage === 'ready' ? 'bg-cyan-500' :
                          stage === 'draft_generated' ? 'bg-amber-500' :
                          'bg-gray-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </StaggerContainer>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <StaggerContainer className="space-y-4">
          <GlassCard>
            <GlassCardHeader title="Content Analytics Feedback" description="Performance-driven calendar adjustments" action={
              <button onClick={handleLoadAnalytics} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20">
                <RefreshCw className="w-3 h-3" /> Load Analytics
              </button>
            } />
            {analytics ? (
              <div className="space-y-6 mt-4">
                <p className="text-sm text-gray-400">{analytics.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Top Content Types</h4>
                    <div className="space-y-1">
                      {analytics.topPerformingContentTypes?.slice(0, 3).map((ct: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-white/[0.03]">
                          <span className="text-gray-300 capitalize">{ct.type}</span>
                          <span className="text-cyan-400">{(ct.avgEngagement * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Best Posting Days</h4>
                    <div className="space-y-1">
                      {analytics.bestPostingDays?.map((day: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-white/[0.03]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-gray-300">{day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {analytics.adjustments?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Recommended Adjustments</h4>
                    <div className="space-y-2">
                      {analytics.adjustments.map((adj: any, i: number) => (
                        <div key={i} className={cn('p-3 rounded-lg text-sm', adj.impact === 'high' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/[0.03]')}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', adj.impact === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400')}>{adj.impact}</span>
                            <span className="text-xs text-gray-500 capitalize">{adj.type.replace('_', ' ')}</span>
                          </div>
                          <p className="text-gray-300">{adj.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                Click "Load Analytics" to analyze published content performance.
              </div>
            )}
          </GlassCard>
        </StaggerContainer>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <StaggerContainer className="space-y-4">
          <GlassCard>
            <GlassCardHeader title="Automation Mode" description="Control how content is generated, reviewed, and published" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {[
                {
                  mode: 'manual',
                  title: 'Manual',
                  desc: 'AI drafts content. You review and publish manually.',
                  features: ['AI generates drafts', 'You approve each post', 'You publish manually', 'Full control'],
                },
                {
                  mode: 'approval',
                  title: 'Approval',
                  desc: 'AI drafts and schedules. You approve before publishing.',
                  features: ['AI drafts content', 'Auto-schedules posts', 'You approve queue', 'AI publishes approved'],
                },
                {
                  mode: 'autonomous',
                  title: 'Autonomous',
                  desc: 'AI handles everything. You review performance only.',
                  features: ['Full AI generation', 'Auto-scheduling', 'Auto-publishing', 'Performance reports'],
                },
              ].map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => handleModeChange(opt.mode)}
                  className={cn(
                    'text-left p-5 rounded-xl border transition-all',
                    publishingMode?.mode === opt.mode
                      ? 'border-cyan-500/40 bg-cyan-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      publishingMode?.mode === opt.mode ? 'border-cyan-400' : 'border-gray-500'
                    )}>
                      {publishingMode?.mode === opt.mode && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                    </div>
                    <h3 className="font-semibold text-gray-200">{opt.title}</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{opt.desc}</p>
                  <ul className="space-y-1">
                    {opt.features.map((f, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-green-400/60" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader title="Google Sheets Sync" description="Sync your calendar to a Google Sheet for external access" />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">
                  {status?.calendar?.hasEntries
                    ? `${status.calendar.total} entries ready for sync`
                    : 'Generate a calendar first before syncing'}
                </p>
                {report?.sheets?.sheetUrl && (
                  <a href={report.sheets.sheetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline mt-1 inline-block">
                    Open Sheet →
                  </a>
                )}
              </div>
              <button
                onClick={handleSyncToSheets}
                disabled={syncingToSheets || !status?.calendar?.hasEntries}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {syncingToSheets ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader title="Status Overview" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Calendar Entries', value: status?.calendar?.total || 0 },
                { label: 'Queue Items', value: status?.queue?.total || 0 },
                { label: 'Published', value: status?.calendar?.byStatus?.published || 0 },
                { label: 'Pending', value: (status?.queue?.total || 0) - (status?.calendar?.byStatus?.published || 0) },
              ].map((stat, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/[0.03] text-center">
                  <p className="text-2xl font-bold text-cyan-400">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerContainer>
      )}
    </div>
  );
}
