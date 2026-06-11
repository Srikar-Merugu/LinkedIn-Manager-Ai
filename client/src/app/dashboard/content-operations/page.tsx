'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDays,
  ListTodo,
  Settings2,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Upload,
  Loader2,
  Link as LinkIcon,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface CalendarEntry {
  date: string;
  type: string;
  pillar: string;
  topic: string;
  hook: string;
  status: string;
}

interface QueueItem {
  id: string;
  topic: string;
  status: string;
  priority: string;
  pillar: string;
}

interface ContentCalendar {
  entries: CalendarEntry[];
  queue: QueueItem[];
  publishingMode: string;
}

interface AnalysisReport {
  _id?: string;
  contentCalendar?: ContentCalendar;
  [key: string]: any;
}

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

const queueStages = ['idea', 'planned', 'draft_generated', 'ready', 'approved', 'scheduled', 'published'];

export default function ContentOperationsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [syncingToSheets, setSyncingToSheets] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.report.get();
        if (!data || (data && typeof data === 'object' && 'message' in data && !data._id)) {
          setReport(null);
        } else {
          setReport(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSyncToSheets = async () => {
    setSyncingToSheets(true);
    setError(null);
    try {
      await api.contentOperations.syncToSheets(report?.userId || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncingToSheets(false);
    }
  };

  const calendar: ContentCalendar = report?.contentCalendar || { entries: [], queue: [], publishingMode: 'manual' };
  const calendarEntries: CalendarEntry[] = calendar.entries || [];
  const queueItems: QueueItem[] = calendar.queue || [];
  const publishingMode: string = calendar.publishingMode || 'manual';

  const today = new Date();
  const currentMonthEntries = calendarEntries.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(today);
  const firstDay = getFirstDayOfMonth(today);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const queueByStage: Record<string, QueueItem[]> = {};
  for (const stage of queueStages) {
    queueByStage[stage] = queueItems.filter((q) => q.status === stage || q.priority === stage);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Content Operations
        </h1>
        <GlassCard>
          <div className="text-center py-16">
            <CalendarDays className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Complete onboarding to see your content operations</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Run through onboarding to generate your personalized content calendar, queue, and publishing pipeline.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              <LinkIcon className="w-4 h-4" />
              Go to Onboarding
            </Link>
          </div>
        </GlassCard>
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
            disabled={syncingToSheets || calendarEntries.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-50 transition-all"
          >
            <Upload className={cn('w-4 h-4', syncingToSheets && 'animate-spin')} />
            Sync Sheets
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
                  <p className="text-2xl font-bold">{calendarEntries.length}</p>
                  <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                    {Object.entries(
                      calendarEntries.reduce((acc, e) => {
                        acc[e.status] = (acc[e.status] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([s, c]) => (
                      <span key={s} className={cn('px-1.5 py-0.5 rounded', statusColors[s] || '')}>
                        {c} {s}
                      </span>
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
                  <p className="text-2xl font-bold">{queueItems.length}</p>
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
                  <p className="text-lg font-bold capitalize">{publishingMode}</p>
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
                  <p className="text-xs text-gray-400">Pipeline</p>
                  <p className="text-lg font-bold">{queueItems.length} items</p>
                  <p className="text-xs text-gray-500">{queueByStage['published']?.length || 0} published</p>
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
          {calendarEntries.length === 0 ? (
            <GlassCard>
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 text-cyan-400/50" />
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No Calendar Entries</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Complete onboarding to generate your content calendar.
                </p>
              </div>
            </GlassCard>
          ) : (
            <GlassCard>
              <GlassCardHeader
                title={`${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                description={`${currentMonthEntries.length} entries this month`}
              />
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map((d) => (
                  <div key={d} className="text-xs text-gray-500 text-center py-2 font-medium">
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 rounded-lg bg-white/[0.02]" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayEntries = calendarEntries.filter((e) => e.date?.startsWith(dateStr));
                  const isToday = day === today.getDate();

                  return (
                    <div
                      key={day}
                      className={cn(
                        'h-24 rounded-lg p-1.5 border transition-all overflow-hidden',
                        isToday
                          ? 'border-cyan-500/40 bg-cyan-500/5'
                          : 'border-white/5 hover:border-white/10 bg-white/[0.02]'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-xs font-medium', isToday ? 'text-cyan-400' : 'text-gray-400')}>
                          {day}
                        </span>
                        {dayEntries.length > 0 && (
                          <span className="text-[10px] text-gray-500">{dayEntries.length}</span>
                        )}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayEntries.slice(0, 2).map((entry, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'text-[10px] px-1 py-0.5 rounded truncate',
                              statusColors[entry.status] || 'bg-gray-500/20 text-gray-400'
                            )}
                          >
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
          {queueItems.length === 0 ? (
            <GlassCard>
              <div className="text-center py-12">
                <ListTodo className="w-12 h-12 mx-auto mb-4 text-cyan-400/50" />
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Queue Empty</h3>
                <p className="text-gray-500">Complete onboarding to populate the content queue.</p>
              </div>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {queueStages.map((stage) => {
                const items = queueByStage[stage] || [];
                return (
                  <div key={stage}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', stageColors[stage] || 'bg-gray-500/20 text-gray-400')}>
                        {stage.replace('_', ' ')} ({items.length})
                      </div>
                    </div>
                    <div className="space-y-2">
                      {items.slice(0, 8).map((item) => (
                        <GlassCard key={item.id} className="cursor-pointer hover:bg-white/[0.04] transition-all">
                          <p className="text-xs font-medium text-gray-200 truncate">{item.topic || 'Untitled'}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-gray-500 capitalize">{item.pillar}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded', statusColors[item.status] || 'bg-gray-500/20 text-gray-400')}>
                              {item.status}
                            </span>
                          </div>
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
              {queueStages.map((stage) => {
                const count = queueByStage[stage]?.length || 0;
                const total = queueItems.length || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            stage === 'published'
                              ? 'bg-emerald-500'
                              : stage === 'scheduled'
                                ? 'bg-purple-500'
                                : stage === 'approved'
                                  ? 'bg-green-500'
                                  : 'bg-gray-500'
                          )}
                        />
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
                          stage === 'published'
                            ? 'bg-emerald-500'
                            : stage === 'scheduled'
                              ? 'bg-purple-500'
                              : stage === 'approved'
                                ? 'bg-green-500'
                                : stage === 'ready'
                                  ? 'bg-cyan-500'
                                  : stage === 'draft_generated'
                                    ? 'bg-amber-500'
                                    : 'bg-gray-500'
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

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <StaggerContainer className="space-y-4">
          <GlassCard>
            <GlassCardHeader title="Publishing Mode" description="Current automation level for content publishing" />
            <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-3">
                <Settings2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-lg font-semibold text-gray-200 capitalize">{publishingMode}</p>
                  <p className="text-sm text-gray-400">
                    {publishingMode === 'manual' && 'AI drafts content. You review and publish manually.'}
                    {publishingMode === 'approval' && 'AI drafts and schedules. You approve before publishing.'}
                    {publishingMode === 'autonomous' && 'AI handles everything. You review performance only.'}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader title="Google Sheets Sync" description="Sync your calendar to a Google Sheet for external access" />
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-300">
                {calendarEntries.length > 0
                  ? `${calendarEntries.length} entries ready for sync`
                  : 'No entries to sync'}
              </p>
              <button
                onClick={handleSyncToSheets}
                disabled={syncingToSheets || calendarEntries.length === 0}
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
                { label: 'Calendar Entries', value: calendarEntries.length },
                { label: 'Queue Items', value: queueItems.length },
                { label: 'Published', value: calendarEntries.filter((e) => e.status === 'published').length },
                {
                  label: 'Pending',
                  value: calendarEntries.filter((e) => e.status !== 'published').length,
                },
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
