'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Send, CheckCircle2, Clock, AlertTriangle,
  Loader2, FileText, Eye, ArrowRight,
} from 'lucide-react';

type QueueStatus = 'draft_generated' | 'ready' | 'scheduled' | 'published';

interface QueueItem {
  _id: string;
  topic: string;
  hook: string;
  contentType: string;
  pillarName: string;
  scheduledDate?: string;
  stage: QueueStatus;
  draft?: string;
  overallScore?: number;
}

const STATUS_CONFIG: Record<QueueStatus, { label: string; color: string; bg: string }> = {
  draft_generated: { label: 'Draft', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ready: { label: 'Ready for Review', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  scheduled: { label: 'Scheduled', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  published: { label: 'Published', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
};

export default function PublishingCenterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<QueueStatus | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const userId = user?.id || '';

  const loadQueue = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.contentOperations.getQueue(userId);
      setItems(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load publishing queue');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function handleAdvanceStatus(item: QueueItem) {
    setUpdating(item._id);
    try {
      await api.contentOperations.advanceQueue(item._id);
      await loadQueue();
    } catch { /* ignore */ }
    setUpdating(null);
  }

  async function handleDelete(item: QueueItem) {
    setUpdating(item._id);
    try {
      await api.contentOperations.updateQueueItem(item._id, { stage: 'draft_generated' });
      await loadQueue();
    } catch { /* ignore */ }
    setUpdating(null);
  }

  const filteredItems = activeFilter === 'all' ? items : items.filter(i => i.stage === activeFilter);

  const stats = {
    draft_generated: items.filter(i => i.stage === 'draft_generated').length,
    ready: items.filter(i => i.stage === 'ready').length,
    scheduled: items.filter(i => i.stage === 'scheduled').length,
    published: items.filter(i => i.stage === 'published').length,
  };

  const workflowStages = [
    { key: 'draft_generated' as QueueStatus, label: 'Drafts', count: stats.draft_generated, icon: FileText },
    { key: 'ready' as QueueStatus, label: 'Ready', count: stats.ready, icon: Eye },
    { key: 'scheduled' as QueueStatus, label: 'Scheduled', count: stats.scheduled, icon: Clock },
    { key: 'published' as QueueStatus, label: 'Published', count: stats.published, icon: CheckCircle2 },
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-3">Failed to Load Queue</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button onClick={loadQueue} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600">
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
          <h1 className="text-2xl font-bold text-surface-100">Publishing Center</h1>
          <p className="text-sm text-surface-500 mt-1">Manage your content workflow from draft to published</p>
        </div>
      </motion.div>

      {/* Workflow Pipeline */}
      <div className="glass-card rounded-2xl p-6 border border-white/5">
        <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Publishing Pipeline</h3>
        <div className="flex items-center gap-3">
          {workflowStages.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-3 flex-1">
              <button onClick={() => setActiveFilter(activeFilter === stage.key ? 'all' : stage.key)}
                className={cn(
                  'flex-1 p-4 rounded-xl border text-center transition-all',
                  activeFilter === stage.key ? `${STATUS_CONFIG[stage.key].bg} border-current` : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                )}
              >
                <stage.icon className={cn('w-5 h-5 mx-auto mb-2', STATUS_CONFIG[stage.key].color)} />
                <p className={cn('text-2xl font-bold', STATUS_CONFIG[stage.key].color)}>{stage.count}</p>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">{stage.label}</p>
              </button>
              {i < workflowStages.length - 1 && (
                <ArrowRight className="w-4 h-4 text-surface-600 flex-shrink-0" />
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
                    <span className="px-2 py-0.5 rounded bg-white/[0.05] text-[10px] text-surface-400 capitalize">
                      {item.contentType?.replace('_', ' ')}
                    </span>
                    {item.overallScore && (
                      <span className={cn('text-[10px] font-bold', item.overallScore >= 70 ? 'text-green-400' : 'text-amber-400')}>
                        {item.overallScore}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-surface-200 truncate">{item.topic}</p>
                  <p className="text-xs text-surface-500 truncate">{item.hook}</p>
                  {item.scheduledDate && (
                    <p className="text-[10px] text-surface-500 mt-1">
                      Scheduled: {new Date(item.scheduledDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.stage !== 'published' && (
                    <button onClick={() => handleAdvanceStatus(item)} disabled={updating === item._id}
                      className="px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-500/20 disabled:opacity-50">
                      {updating === item._id ? '...' : item.stage === 'draft_generated' ? 'Mark Ready' : item.stage === 'ready' ? 'Schedule' : 'Publish'}
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
              <h3 className="text-lg font-semibold text-surface-100">{selectedItem.topic}</h3>
              <button onClick={() => setSelectedItem(null)} className="text-surface-500 hover:text-surface-300">✕</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Status</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium border', STATUS_CONFIG[selectedItem.stage]?.bg, STATUS_CONFIG[selectedItem.stage]?.color)}>
                  {STATUS_CONFIG[selectedItem.stage]?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Type</span>
                <span className="text-surface-200 capitalize">{selectedItem.contentType?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Pillar</span>
                <span className="text-surface-200">{selectedItem.pillarName}</span>
              </div>
              {selectedItem.scheduledDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-surface-400">Scheduled</span>
                  <span className="text-surface-200">{new Date(selectedItem.scheduledDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-surface-400 mb-1">Hook</p>
                <p className="text-sm text-surface-300">{selectedItem.hook}</p>
              </div>
              {selectedItem.draft && (
                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs text-surface-400 mb-1">Draft</p>
                  <p className="text-sm text-surface-300 whitespace-pre-line">{selectedItem.draft}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
