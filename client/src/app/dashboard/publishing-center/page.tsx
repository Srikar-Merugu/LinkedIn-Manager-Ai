'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Send, CheckCircle2, Clock, AlertTriangle,
  Loader2, FileText, Eye, ArrowRight, Link2,
  Calendar, Play, RefreshCw, Unlink, Zap, Timer,
} from 'lucide-react';

type QueueStatus = 'draft_generated' | 'ready' | 'scheduled' | 'published' | 'failed';

interface QueueItem {
  _id: string;
  title?: string;
  topic?: string;
  hook?: string;
  contentType?: string;
  stage: QueueStatus;
  scheduledAt?: string;
  publishedAt?: string;
  linkedinPostId?: string;
  lastError?: string;
  overallScore?: number;
  postId?: string;
}

interface LinkedInStatus {
  connected: boolean;
  profile?: { name?: string; email?: string; id?: string };
  error?: string;
}

interface PublisherStatus {
  scheduledCount: number;
  publishedCount: number;
  failedCount: number;
  nextScheduledAt: string | null;
  schedulerRunning: boolean;
}

const STATUS_CONFIG: Record<QueueStatus, { label: string; color: string; bg: string; icon: any }> = {
  draft_generated: { label: 'Draft', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: FileText },
  ready: { label: 'Ready', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Eye },
  scheduled: { label: 'Scheduled', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Clock },
  published: { label: 'Published', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertTriangle },
};

export default function PublishingCenterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<QueueStatus | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const [linkedinStatus, setLinkedinStatus] = useState<LinkedInStatus | null>(null);
  const [publisherStatus, setPublisherStatus] = useState<PublisherStatus | null>(null);
  const [connectingLinkedin, setConnectingLinkedin] = useState(false);

  const [schedulingItem, setSchedulingItem] = useState<QueueItem | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');

  const userId = user?.id || '';

  const loadQueue = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [queueData, pubStatus] = await Promise.all([
        api.contentOperations.getQueue(userId),
        api.publishing.getStatus().catch(() => null),
      ]);
      setItems(queueData || []);
      setPublisherStatus(pubStatus);
    } catch (e: any) {
      setError(e?.message || 'Failed to load publishing queue');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const checkLinkedIn = useCallback(async () => {
    try {
      const status = await api.publishing.getLinkedInStatus();
      setLinkedinStatus(status);
    } catch {
      setLinkedinStatus({ connected: false });
    }
  }, []);

  useEffect(() => { loadQueue(); checkLinkedIn(); }, [loadQueue, checkLinkedIn]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadQueue();
      checkLinkedIn();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadQueue, checkLinkedIn]);

  // Handle URL params from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin') === 'connected') {
      checkLinkedIn();
      window.history.replaceState({}, '', '/dashboard/publishing-center');
    }
  }, [checkLinkedIn]);

  async function handleConnectLinkedIn() {
    setConnectingLinkedin(true);
    try {
      const { url } = await api.publishing.getLinkedInUrl();
      window.location.href = url;
    } catch {
      setConnectingLinkedin(false);
    }
  }

  async function handleDisconnectLinkedIn() {
    await api.publishing.disconnectLinkedIn();
    setLinkedinStatus({ connected: false });
  }

  async function handleApprove(item: QueueItem) {
    setUpdating(item._id);
    try {
      await api.publishing.approveItem(item._id);
      await loadQueue();
    } catch { /* ignore */ }
    setUpdating(null);
  }

  async function handlePublishNow(item: QueueItem) {
    setUpdating(item._id);
    try {
      await api.publishing.publishNow(item._id);
      await loadQueue();
    } catch { /* ignore */ }
    setUpdating(null);
  }

  async function handleRetry(item: QueueItem) {
    setUpdating(item._id);
    try {
      await api.publishing.retryFailed(item._id);
      await loadQueue();
    } catch { /* ignore */ }
    setUpdating(null);
  }

  async function handleBulkApprove() {
    const draftItems = items.filter(i => i.stage === 'draft_generated' || i.stage === 'ready');
    if (draftItems.length === 0) return;
    setUpdating('bulk');
    try {
      await api.publishing.bulkApprove(draftItems.map(i => i._id));
      await loadQueue();
    } catch { /* ignore */ }
    setUpdating(null);
  }

  async function handleTriggerPublish() {
    setUpdating('trigger');
    try {
      await api.publishing.triggerPublish();
      await loadQueue();
    } catch { /* ignore */ }
    setUpdating(null);
  }

  async function handleSchedule() {
    if (!schedulingItem || !scheduleDate) return;
    setUpdating(schedulingItem._id);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      await api.publishing.approveItem(schedulingItem._id, scheduledAt);
      await loadQueue();
      setSchedulingItem(null);
      setScheduleDate('');
      setScheduleTime('09:00');
    } catch { /* ignore */ }
    setUpdating(null);
  }

  function getSchedulingDefaults() {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(9, 0, 0, 0);
    const date = now.toISOString().split('T')[0];
    setScheduleDate(date);
    setScheduleTime('09:00');
  }

  const filteredItems = activeFilter === 'all' ? items : items.filter(i => i.stage === activeFilter);

  const stats = {
    draft_generated: items.filter(i => i.stage === 'draft_generated').length,
    ready: items.filter(i => i.stage === 'ready').length,
    scheduled: items.filter(i => i.stage === 'scheduled').length,
    published: items.filter(i => i.stage === 'published').length,
    failed: items.filter(i => i.stage === 'failed').length,
  };

  const workflowStages = [
    { key: 'draft_generated' as QueueStatus, label: 'Drafts', count: stats.draft_generated, icon: FileText },
    { key: 'ready' as QueueStatus, label: 'Ready', count: stats.ready, icon: Eye },
    { key: 'scheduled' as QueueStatus, label: 'Scheduled', count: stats.scheduled, icon: Clock },
    { key: 'published' as QueueStatus, label: 'Published', count: stats.published, icon: CheckCircle2 },
    { key: 'failed' as QueueStatus, label: 'Failed', count: stats.failed, icon: AlertTriangle },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">Loading publishing queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Publishing Center</h1>
          <p className="text-sm text-surface-500 mt-1">Manage your content workflow from draft to published</p>
        </div>
      </motion.div>

      {/* LinkedIn Connection Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
              linkedinStatus?.connected ? 'bg-green-500/10' : 'bg-surface-500/10')}>
              <Link2 className={cn('w-5 h-5', linkedinStatus?.connected ? 'text-green-400' : 'text-surface-400')} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-100">
                {linkedinStatus?.connected ? 'LinkedIn Connected' : 'Connect LinkedIn'}
              </h3>
              <p className="text-xs text-surface-500">
                {linkedinStatus?.connected
                  ? `Connected as ${linkedinStatus.profile?.name || linkedinStatus.profile?.email || 'Unknown'}`
                  : 'Connect your LinkedIn account to auto-publish posts'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {linkedinStatus?.connected ? (
              <>
                <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium">
                  Active
                </span>
                <button onClick={handleDisconnectLinkedIn}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20">
                  <Unlink className="w-3 h-3 inline mr-1" />
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={handleConnectLinkedIn} disabled={connectingLinkedin}
                className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 disabled:opacity-50">
                {connectingLinkedin ? (
                  <><Loader2 className="w-3 h-3 inline mr-1 animate-spin" /> Connecting...</>
                ) : (
                  <><Link2 className="w-3 h-3 inline mr-1" /> Connect LinkedIn</>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Publisher Status */}
      {publisherStatus && (
        <div className="grid grid-cols-4 gap-3">
          <div className="glass-card rounded-xl p-4 border border-white/5 text-center">
            <p className="text-2xl font-bold text-purple-400">{publisherStatus.scheduledCount}</p>
            <p className="text-[10px] text-surface-500 uppercase">Queued</p>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5 text-center">
            <p className="text-2xl font-bold text-green-400">{publisherStatus.publishedCount}</p>
            <p className="text-[10px] text-surface-500 uppercase">Published</p>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5 text-center">
            <p className="text-2xl font-bold text-red-400">{publisherStatus.failedCount}</p>
            <p className="text-[10px] text-surface-500 uppercase">Failed</p>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5 text-center">
            <div className="flex items-center justify-center gap-1">
              <div className={cn('w-2 h-2 rounded-full', publisherStatus.schedulerRunning ? 'bg-green-400 animate-pulse' : 'bg-surface-500')} />
              <p className="text-xs text-surface-400">{publisherStatus.schedulerRunning ? 'Auto-publish ON' : 'Scheduler OFF'}</p>
            </div>
            {publisherStatus.nextScheduledAt && (
              <p className="text-[10px] text-surface-500 mt-1">
                Next: {new Date(publisherStatus.nextScheduledAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="flex gap-2">
        {(stats.draft_generated + stats.ready > 0) && linkedinStatus?.connected && (
          <button onClick={handleBulkApprove} disabled={updating === 'bulk'}
            className="px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 text-sm font-medium hover:bg-purple-500/20 disabled:opacity-50 flex items-center gap-2">
            {updating === 'bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Approve All ({stats.draft_generated + stats.ready})
          </button>
        )}
        {stats.scheduled > 0 && linkedinStatus?.connected && (
          <button onClick={handleTriggerPublish} disabled={updating === 'trigger'}
            className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 disabled:opacity-50 flex items-center gap-2">
            {updating === 'trigger' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Trigger Publish ({stats.scheduled})
          </button>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-surface-500">Auto-refresh 30s</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button onClick={loadQueue} className="text-xs text-red-400 hover:text-red-300">Retry</button>
        </div>
      )}

      {/* Workflow Pipeline */}
      <div className="glass-card rounded-2xl p-6 border border-white/5">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Publishing Pipeline</h3>
        <div className="flex items-center gap-2">
          {workflowStages.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-2 flex-1">
              <button onClick={() => setActiveFilter(activeFilter === stage.key ? 'all' : stage.key)}
                className={cn(
                  'flex-1 p-3 rounded-xl border text-center transition-all',
                  activeFilter === stage.key ? `${STATUS_CONFIG[stage.key].bg} border-current` : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                )}
              >
                <stage.icon className={cn('w-4 h-4 mx-auto mb-1', STATUS_CONFIG[stage.key].color)} />
                <p className={cn('text-xl font-bold', STATUS_CONFIG[stage.key].color)}>{stage.count}</p>
                <p className="text-[9px] text-surface-500 uppercase tracking-wider">{stage.label}</p>
              </button>
              {i < workflowStages.length - 1 && (
                <ArrowRight className="w-3 h-3 text-surface-600 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Queue Items */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 border border-white/5 text-center">
            <Send className="w-12 h-12 text-surface-600 mx-auto mb-3" />
            <p className="text-surface-400 text-sm">
              {activeFilter === 'all' ? 'No items in publishing queue. Generate content in Content Studio.' : `No ${STATUS_CONFIG[activeFilter]?.label.toLowerCase()} items.`}
            </p>
          </div>
        ) : (
          filteredItems.map(item => (
            <motion.div key={item._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card rounded-xl p-4 border border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium border', STATUS_CONFIG[item.stage]?.bg, STATUS_CONFIG[item.stage]?.color)}>
                      {STATUS_CONFIG[item.stage]?.label}
                    </span>
                    {item.contentType && (
                      <span className="px-2 py-0.5 rounded bg-white/[0.05] text-[10px] text-surface-400 capitalize">
                        {item.contentType.replace('_', ' ')}
                      </span>
                    )}
                    {item.overallScore && (
                      <span className={cn('text-[10px] font-bold', item.overallScore >= 70 ? 'text-green-400' : 'text-amber-400')}>
                        {item.overallScore}
                      </span>
                    )}
                    {item.linkedinPostId && (
                      <span className="px-2 py-0.5 rounded bg-green-500/10 text-[10px] text-green-400">
                        LinkedIn ID: {item.linkedinPostId.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-surface-200 truncate">{item.title || item.topic || 'Untitled'}</p>
                  {item.hook && <p className="text-xs text-surface-500 truncate">{item.hook}</p>}
                  {item.lastError && (
                    <p className="text-xs text-red-400 truncate mt-1">Error: {item.lastError}</p>
                  )}
                  {item.scheduledAt && (
                    <p className="text-[10px] text-surface-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Scheduled: {new Date(item.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Draft/Ready -> Approve + Schedule */}
                  {(item.stage === 'draft_generated' || item.stage === 'ready') && linkedinStatus?.connected && (
                    <>
                      <button onClick={() => handleApprove(item)} disabled={updating === item._id}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-medium hover:bg-purple-500/20 disabled:opacity-50">
                        {updating === item._id ? '...' : 'Approve'}
                      </button>
                      <button onClick={() => { setSchedulingItem(item); getSchedulingDefaults(); }}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20">
                        <Timer className="w-3 h-3 inline mr-1" />Schedule
                      </button>
                    </>
                  )}
                  {/* Scheduled -> Publish Now */}
                  {item.stage === 'scheduled' && linkedinStatus?.connected && (
                    <button onClick={() => handlePublishNow(item)} disabled={updating === item._id}
                      className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-50">
                      {updating === item._id ? '...' : <><Play className="w-3 h-3 inline mr-1" />Publish</>}
                    </button>
                  )}
                  {/* Failed -> Retry */}
                  {item.stage === 'failed' && (
                    <button onClick={() => handleRetry(item)} disabled={updating === item._id}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 disabled:opacity-50">
                      {updating === item._id ? '...' : <><RefreshCw className="w-3 h-3 inline mr-1" />Retry</>}
                    </button>
                  )}
                  <button onClick={() => setSelectedItem(item)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-surface-400">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 border border-white/5 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-surface-100">{selectedItem.title || selectedItem.topic}</h3>
              <button onClick={() => setSelectedItem(null)} className="text-surface-500 hover:text-surface-300">✕</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Status</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium border', STATUS_CONFIG[selectedItem.stage]?.bg, STATUS_CONFIG[selectedItem.stage]?.color)}>
                  {STATUS_CONFIG[selectedItem.stage]?.label}
                </span>
              </div>
              {selectedItem.scheduledAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-surface-400">Scheduled</span>
                  <span className="text-surface-200">{new Date(selectedItem.scheduledAt).toLocaleString()}</span>
                </div>
              )}
              {selectedItem.publishedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-surface-400">Published</span>
                  <span className="text-surface-200">{new Date(selectedItem.publishedAt).toLocaleString()}</span>
                </div>
              )}
              {selectedItem.linkedinPostId && (
                <div className="flex justify-between text-sm">
                  <span className="text-surface-400">LinkedIn Post ID</span>
                  <span className="text-surface-200 font-mono text-xs">{selectedItem.linkedinPostId}</span>
                </div>
              )}
              {selectedItem.lastError && (
                <div className="pt-2 border-t border-red-500/20">
                  <p className="text-xs text-red-400 mb-1">Error</p>
                  <p className="text-sm text-red-300">{selectedItem.lastError}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
              {(selectedItem.stage === 'draft_generated' || selectedItem.stage === 'ready') && linkedinStatus?.connected && (
                <>
                  <button onClick={() => { handleApprove(selectedItem); setSelectedItem(null); }}
                    className="px-4 py-2 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600">
                    Approve
                  </button>
                  <button onClick={() => { setSelectedItem(null); setSchedulingItem(selectedItem); getSchedulingDefaults(); }}
                    className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">
                    <Timer className="w-4 h-4 inline mr-1" />Schedule
                  </button>
                </>
              )}
              {selectedItem.stage === 'scheduled' && linkedinStatus?.connected && (
                <button onClick={() => { handlePublishNow(selectedItem); setSelectedItem(null); }}
                  className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600">
                  Publish Now
                </button>
              )}
              {selectedItem.stage === 'failed' && (
                <button onClick={() => { handleRetry(selectedItem); setSelectedItem(null); }}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600">
                  Retry
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Schedule Post Modal */}
      {schedulingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSchedulingItem(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 border border-white/5 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
                <Timer className="w-5 h-5 text-blue-400" />
                Schedule Post
              </h3>
              <button onClick={() => setSchedulingItem(null)} className="text-surface-500 hover:text-surface-300">✕</button>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-sm font-medium text-surface-200 truncate">{schedulingItem.title || schedulingItem.topic}</p>
              {schedulingItem.hook && <p className="text-xs text-surface-500 truncate mt-1">{schedulingItem.hook}</p>}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-surface-400 mb-1.5">Publish Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-surface-200 text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1.5">Publish Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-surface-200 text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-xs text-blue-400">
                  Will publish on {scheduleDate ? new Date(`${scheduleDate}T${scheduleTime}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '...'} at {scheduleTime || '...'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setSchedulingItem(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 text-surface-400 text-sm font-medium hover:bg-white/10">
                Cancel
              </button>
              <button onClick={handleSchedule} disabled={!scheduleDate || updating === schedulingItem._id}
                className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {updating === schedulingItem._id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
                ) : (
                  <><Timer className="w-4 h-4" /> Schedule Post</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
