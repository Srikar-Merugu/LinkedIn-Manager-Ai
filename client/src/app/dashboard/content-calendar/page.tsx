'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  CalendarDays, Download, ChevronLeft, ChevronRight,
  AlertTriangle, Loader2, Link2, Unlink, ExternalLink,
} from 'lucide-react';

type ViewMode = 'month' | 'list';

interface CalendarEntry {
  _id: string;
  date: string;
  pillarName: string;
  topic: string;
  hook: string;
  contentType: string;
  status: 'draft' | 'scheduled' | 'published' | 'idea';
  source: string;
  overallScore?: number;
}

export default function ContentCalendarPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);

  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null);

  const userId = user?.id || '';

  const loadCalendar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.contentOperations.getCalendar(userId);
      setEntries(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const checkGoogle = useCallback(async () => {
    try {
      const status = await api.google.getStatus();
      setGoogleConnected(status.connected);
    } catch {
      setGoogleConnected(false);
    }
  }, []);

  useEffect(() => { checkGoogle(); }, [checkGoogle]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      checkGoogle();
      window.history.replaceState({}, '', '/dashboard/content-calendar');
    }
  }, [checkGoogle]);

  async function handleConnectGoogle() {
    setConnectingGoogle(true);
    try {
      const { url } = await api.google.getConnectUrl();
      window.location.href = url;
    } catch {
      setConnectingGoogle(false);
    }
  }

  async function handleDisconnectGoogle() {
    await api.google.disconnect();
    setGoogleConnected(false);
    setSheetsUrl(null);
  }

  async function handleSyncToSheets() {
    if (!googleConnected) {
      await handleConnectGoogle();
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      const exportEntries = entries.map(e => ({
        date: e.date,
        topic: e.topic,
        hook: e.hook,
        contentType: e.contentType,
        status: e.status,
        pillarName: e.pillarName,
        overallScore: e.overallScore,
      }));
      if (exportEntries.length === 0) {
        setSyncError('No content to export. Generate posts first.');
        setSyncing(false);
        return;
      }
      const result = await api.google.exportToSheets(exportEntries);
      setSheetsUrl(result.spreadsheetUrl);
    } catch (e: any) {
      setSyncError(e?.message || 'Failed to export');
    }
    setSyncing(false);
  }

  function getDaysInMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  function getEntriesForDay(day: number) {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    return entries.filter(e => {
      const d = new Date(e.date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'published': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'scheduled': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'draft': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-surface-500/10 text-surface-400 border-surface-500/20';
    }
  }

  function getMonthName() {
    return currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const today = new Date();

  const stats = {
    total: entries.length,
    published: entries.filter(e => e.status === 'published').length,
    scheduled: entries.filter(e => e.status === 'scheduled').length,
    draft: entries.filter(e => e.status === 'draft').length,
    idea: entries.filter(e => e.status === 'idea').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">Loading content calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-3">Failed to Load Calendar</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button onClick={loadCalendar} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Content Calendar</h1>
          <p className="text-sm text-surface-500 mt-1">Plan, schedule, and export your content</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/5">
            <button onClick={() => setViewMode('month')}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all', viewMode === 'month' ? 'bg-brand-500/10 text-brand-400' : 'text-surface-400')}>
              Month
            </button>
            <button onClick={() => setViewMode('list')}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all', viewMode === 'list' ? 'bg-brand-500/10 text-brand-400' : 'text-surface-400')}>
              List
            </button>
          </div>
          {googleConnected ? (
            <div className="flex items-center gap-2">
              {sheetsUrl && (
                <a href={sheetsUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20">
                  <ExternalLink className="w-3 h-3" /> Open Sheet
                </a>
              )}
              <button onClick={handleSyncToSheets} disabled={syncing || entries.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-surface-300 hover:text-surface-100 disabled:opacity-50">
                <Download className={cn('w-4 h-4', syncing && 'animate-spin')} />
                {syncing ? 'Exporting...' : 'Export to Sheets'}
              </button>
              <button onClick={handleDisconnectGoogle}
                className="p-2 rounded-lg hover:bg-red-500/10 text-surface-400 hover:text-red-400">
                <Unlink className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleConnectGoogle} disabled={connectingGoogle}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
              {connectingGoogle ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
              ) : (
                <><Link2 className="w-4 h-4" /> Connect Google Sheets</>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-surface-200' },
          { label: 'Published', value: stats.published, color: 'text-green-400' },
          { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-400' },
          { label: 'Drafts', value: stats.draft, color: 'text-amber-400' },
          { label: 'Ideas', value: stats.idea, color: 'text-surface-400' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-3 border border-white/5 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sync Error */}
      {syncError && (
        <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300 flex-1">{syncError}</p>
          <button onClick={() => setSyncError(null)} className="text-xs text-red-400 hover:text-red-300">Dismiss</button>
        </div>
      )}

      {viewMode === 'month' ? (
        /* Month View */
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 rounded-lg hover:bg-white/5 text-surface-400">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold text-surface-100">{getMonthName()}</h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 rounded-lg hover:bg-white/5 text-surface-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] text-surface-500 uppercase tracking-wider py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEntries = getEntriesForDay(day);
              const isToday = today.getDate() === day && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
              return (
                <div key={day}
                  className={cn('aspect-square p-1 rounded-lg border transition-all cursor-pointer hover:bg-white/[0.03]',
                    isToday ? 'border-brand-500/30 bg-brand-500/5' : 'border-white/5',
                    dayEntries.length > 0 && 'bg-white/[0.02]'
                  )}
                  onClick={() => dayEntries.length > 0 && setSelectedEntry(dayEntries[0])}
                >
                  <span className={cn('text-xs', isToday ? 'text-brand-400 font-bold' : 'text-surface-400')}>{day}</span>
                  {dayEntries.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {dayEntries.slice(0, 2).map((e, j) => (
                        <div key={j} className={cn('text-[8px] px-1 py-0.5 rounded truncate', getStatusColor(e.status))}>
                          {e.topic?.substring(0, 15)}
                        </div>
                      ))}
                      {dayEntries.length > 2 && (
                        <div className="text-[8px] text-surface-500 text-center">+{dayEntries.length - 2}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 border border-white/5 text-center">
              <CalendarDays className="w-12 h-12 text-surface-600 mx-auto mb-3" />
              <p className="text-surface-400">No calendar entries yet. Generate a content strategy first.</p>
            </div>
          ) : (
            entries.map(entry => (
              <motion.div key={entry._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-4 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="w-16 text-center">
                  <p className="text-xs text-surface-500">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                  <p className="text-lg font-bold text-surface-200">{new Date(entry.date).getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{entry.topic}</p>
                  <p className="text-xs text-surface-500 truncate">{entry.hook}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.05] text-surface-400 capitalize">
                  {entry.pillarName}
                </span>
                <span className={cn('px-2 py-1 rounded-lg text-[10px] font-medium border capitalize', getStatusColor(entry.status))}>
                  {entry.status}
                </span>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEntry(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 border border-white/5 max-w-lg w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-surface-100">{selectedEntry.topic}</h3>
              <button onClick={() => setSelectedEntry(null)} className="text-surface-500 hover:text-surface-300">✕</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Date</span>
                <span className="text-surface-200">{new Date(selectedEntry.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Pillar</span>
                <span className="text-surface-200">{selectedEntry.pillarName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Type</span>
                <span className="text-surface-200 capitalize">{selectedEntry.contentType?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Status</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium border capitalize', getStatusColor(selectedEntry.status))}>
                  {selectedEntry.status}
                </span>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-surface-400 mb-1">Hook</p>
                <p className="text-sm text-surface-300">{selectedEntry.hook}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
