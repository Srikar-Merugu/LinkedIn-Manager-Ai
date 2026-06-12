'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronRight, Sparkles, Rocket, Target, CheckCircle2,
  AlertTriangle, Loader2, ArrowRight, Calendar, Clock, Flame, Eye,
  TrendingUp, Users, Zap, Plus, X, Pause, Play, Trash2, RefreshCw,
  BarChart3, Star, Send, FileText, Settings,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const TOPIC_OPTIONS = [
  'Full Stack Development', 'React', 'Node.js', 'Laravel', 'Android Development',
  'Kotlin', 'Artificial Intelligence', 'Generative AI', 'Machine Learning',
  'Career Growth', 'Interview Preparation', 'Internship Journey',
  'Open Source', 'Startups', 'Freelancing', 'Personal Branding',
  'System Design', 'DevOps', 'Cloud Computing', 'Python', 'TypeScript',
];

const POSTING_DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const POSTING_TIME_OPTIONS = ['08:00', '09:00', '10:00', '12:00', '14:00', '17:00', '18:00', '20:00', '21:00'];
const FREQUENCY_OPTIONS = [
  { value: 3, label: '3 Posts', desc: 'Mon / Wed / Fri' },
  { value: 5, label: '5 Posts', desc: 'Weekdays' },
  { value: 7, label: 'Daily', desc: 'Every day' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-surface-800 text-surface-500',
  generating: 'bg-amber-500/10 text-amber-400',
  generated: 'bg-blue-500/10 text-blue-400',
  scheduled: 'bg-purple-500/10 text-purple-400',
  published: 'bg-green-500/10 text-green-400',
  failed: 'bg-red-500/10 text-red-400',
  rest: 'bg-surface-800 text-surface-600',
};

export default function ContentStudioPage() {
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<any>(null);
  const [generatingToday, setGeneratingToday] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [batchCount, setBatchCount] = useState(7);

  const [wizardStep, setWizardStep] = useState(0);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [postingDays, setPostingDays] = useState<string[]>(['Monday', 'Wednesday', 'Friday']);
  const [postingTime, setPostingTime] = useState('09:00');
  const [reviewMode, setReviewMode] = useState(false);
  const [starting, setStarting] = useState(false);

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.contentChallenge.get();
      setChallenge(res.exists ? res : null);
    } catch {
      setChallenge(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadChallenge(); }, [loadChallenge]);

  const toggleTopic = (t: string) => {
    setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const addCustomTopic = () => {
    if (customTopic.trim() && !selectedTopics.includes(customTopic.trim())) {
      setSelectedTopics(prev => [...prev, customTopic.trim()]);
      setCustomTopic('');
    }
  };

  const toggleDay = (d: string) => {
    setPostingDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleStartChallenge = async () => {
    if (selectedTopics.length === 0 || postingDays.length === 0) return;
    setStarting(true);
    try {
      await api.contentChallenge.start({
        topics: selectedTopics,
        postsPerWeek,
        postingDays,
        postingTime,
        reviewMode,
      });
      await loadChallenge();
      setWizardStep(0);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start challenge');
    } finally {
      setStarting(false);
    }
  };

  const handleGenerateToday = async () => {
    setGeneratingToday(true);
    try {
      await api.contentChallenge.generateToday();
      await loadChallenge();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGeneratingToday(false);
    }
  };

  const handleGenerateBatch = async () => {
    setGeneratingBatch(true);
    try {
      await api.contentChallenge.generateBatch(batchCount);
      await loadChallenge();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to batch generate');
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handlePause = async () => {
    await api.contentChallenge.pause();
    await loadChallenge();
  };

  const handleResume = async () => {
    await api.contentChallenge.resume();
    await loadChallenge();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this challenge? This cannot be undone.')) return;
    await api.contentChallenge.delete();
    setChallenge(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
        <p className="text-surface-400 text-sm">Loading Content Studio...</p>
      </div>
    </div>
  );

  if (!challenge) {
    return (
      <StaggerContainer className="space-y-5">
        <StaggerItem>
          <div>
            <h1 className="text-xl font-bold text-surface-100 mb-0.5">Content Studio</h1>
            <p className="text-surface-500 text-sm">AI-powered LinkedIn content engine</p>
          </div>
        </StaggerItem>

        {wizardStep === 0 && (
          <StaggerItem>
            <GlassCard glow className="p-8 text-center">
              <Rocket className="w-12 h-12 text-brand-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-surface-100 mb-2">Start Your 90-Day LinkedIn Challenge</h2>
              <p className="text-surface-400 text-sm mb-6 max-w-md mx-auto">
                Let AI generate and publish content for you automatically. Just select your topics and schedule.
              </p>
              <button onClick={() => setWizardStep(1)}
                className="btn-primary inline-flex items-center gap-2 text-sm">
                <Rocket className="w-4 h-4" /> Start Challenge
              </button>
            </GlassCard>
          </StaggerItem>
        )}

        {wizardStep === 1 && (
          <StaggerItem>
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">Step 1</span>
                <h3 className="text-sm font-semibold text-surface-100">What topics do you want to post about?</h3>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {TOPIC_OPTIONS.map(t => (
                  <button key={t} onClick={() => toggleTopic(t)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      selectedTopics.includes(t)
                        ? 'bg-brand-500/20 border-brand-500/30 text-brand-400'
                        : 'bg-white/[0.02] border-white/5 text-surface-400 hover:bg-white/[0.04]')}>
                    {selectedTopics.includes(t) && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={customTopic} onChange={e => setCustomTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomTopic()}
                  placeholder="Add custom topic..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-sm text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/30" />
                <button onClick={addCustomTopic}
                  className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-surface-400 hover:text-surface-200">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {selectedTopics.length > 0 && (
                <p className="text-[11px] text-surface-500 mt-2">{selectedTopics.length} topics selected</p>
              )}
              <div className="flex justify-between mt-6">
                <button onClick={() => setWizardStep(0)} className="text-sm text-surface-500 hover:text-surface-300">Back</button>
                <button onClick={() => setWizardStep(2)} disabled={selectedTopics.length === 0}
                  className="btn-primary text-sm inline-flex items-center gap-1 disabled:opacity-40">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </GlassCard>
          </StaggerItem>
        )}

        {wizardStep === 2 && (
          <StaggerItem>
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">Step 2</span>
                <h3 className="text-sm font-semibold text-surface-100">How many posts per week?</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {FREQUENCY_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setPostsPerWeek(opt.value)}
                    className={cn('p-4 rounded-xl border text-center transition-all',
                      postsPerWeek === opt.value
                        ? 'bg-brand-500/10 border-brand-500/30'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]')}>
                    <p className="text-lg font-bold text-surface-100">{opt.value}</p>
                    <p className="text-[11px] text-surface-400">{opt.desc}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <button onClick={() => setWizardStep(1)} className="text-sm text-surface-500 hover:text-surface-300">Back</button>
                <button onClick={() => setWizardStep(3)} className="btn-primary text-sm inline-flex items-center gap-1">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </GlassCard>
          </StaggerItem>
        )}

        {wizardStep === 3 && (
          <StaggerItem>
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">Step 3</span>
                <h3 className="text-sm font-semibold text-surface-100">Select posting days</h3>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {POSTING_DAY_OPTIONS.map(d => (
                  <button key={d} onClick={() => toggleDay(d)}
                    className={cn('px-4 py-2 rounded-lg text-xs font-medium border transition-all',
                      postingDays.includes(d)
                        ? 'bg-brand-500/20 border-brand-500/30 text-brand-400'
                        : 'bg-white/[0.02] border-white/5 text-surface-400 hover:bg-white/[0.04]')}>
                    {postingDays.includes(d) && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <button onClick={() => setWizardStep(2)} className="text-sm text-surface-500 hover:text-surface-300">Back</button>
                <button onClick={() => setWizardStep(4)} disabled={postingDays.length === 0}
                  className="btn-primary text-sm inline-flex items-center gap-1 disabled:opacity-40">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </GlassCard>
          </StaggerItem>
        )}

        {wizardStep === 4 && (
          <StaggerItem>
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">Step 4</span>
                <h3 className="text-sm font-semibold text-surface-100">Select publishing time</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {POSTING_TIME_OPTIONS.map(t => (
                  <button key={t} onClick={() => setPostingTime(t)}
                    className={cn('p-3 rounded-lg border text-center text-sm transition-all',
                      postingTime === t
                        ? 'bg-brand-500/10 border-brand-500/30 text-brand-400 font-medium'
                        : 'bg-white/[0.02] border-white/5 text-surface-400 hover:bg-white/[0.04]')}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 mb-6">
                <button onClick={() => setReviewMode(!reviewMode)}
                  className={cn('w-10 h-5 rounded-full relative transition-all',
                    reviewMode ? 'bg-brand-500' : 'bg-surface-700')}>
                  <div className={cn('w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all',
                    reviewMode ? 'left-5' : 'left-0.5')} />
                </button>
                <div>
                  <p className="text-xs font-medium text-surface-200">Review Mode</p>
                  <p className="text-[10px] text-surface-500">{reviewMode ? 'Posts need your approval before scheduling' : 'Posts auto-schedule without approval'}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setWizardStep(3)} className="text-sm text-surface-500 hover:text-surface-300">Back</button>
                <button onClick={handleStartChallenge} disabled={starting}
                  className="btn-primary text-sm inline-flex items-center gap-1 disabled:opacity-50">
                  {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                  {starting ? 'Starting...' : 'Launch Challenge'}
                </button>
              </div>
            </GlassCard>
          </StaggerItem>
        )}
      </StaggerContainer>
    );
  }

  const stats = challenge.stats || {};
  const todayEntry = challenge.todayEntry;
  const upcoming = challenge.upcomingEntries || [];
  const calendar = challenge.calendar || [];
  const publishedDays = calendar.filter((c: any) => c.status === 'published').length;
  const scheduledDays = calendar.filter((c: any) => c.status === 'scheduled').length;
  const pendingDays = calendar.filter((c: any) => c.status === 'pending').length;

  return (
    <StaggerContainer className="space-y-5">
      {/* Header */}
      <StaggerItem>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-surface-100 mb-0.5">90-Day LinkedIn Challenge</h1>
            <p className="text-surface-500 text-sm">Day {challenge.currentDay || 1} / 90 — {challenge.completionPct || 0}% complete</p>
          </div>
          <div className="flex items-center gap-2">
            {challenge.status === 'active' ? (
              <button onClick={handlePause} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 hover:bg-amber-500/20 transition-all">
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            ) : challenge.status === 'paused' ? (
              <button onClick={handleResume} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 hover:bg-green-500/20 transition-all">
                <Play className="w-3.5 h-3.5" /> Resume
              </button>
            ) : null}
            <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-surface-400 hover:text-red-400 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </StaggerItem>

      {/* Stats Bar */}
      <StaggerItem>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { label: 'Generated', value: stats.postsGenerated || 0, icon: Sparkles, color: 'text-brand-400' },
            { label: 'Published', value: stats.postsPublished || 0, icon: Send, color: 'text-green-400' },
            { label: 'Streak', value: `${stats.currentStreak || 0}d`, icon: Flame, color: 'text-amber-400' },
            { label: 'Engagement', value: `${stats.avgEngagement || 0}%`, icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Views', value: stats.profileViews || 0, icon: Eye, color: 'text-purple-400' },
            { label: 'Growth', value: `+${stats.followerGrowth || 0}`, icon: Users, color: 'text-cyan-400' },
            { label: 'Scheduled', value: scheduledDays, icon: Calendar, color: 'text-violet-400' },
            { label: 'Remaining', value: challenge.daysRemaining || 0, icon: Target, color: 'text-surface-400' },
          ].map((s, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
              <s.icon className={cn('w-3.5 h-3.5 mx-auto mb-0.5', s.color)} />
              <p className="text-sm font-bold text-surface-100">{s.value}</p>
              <p className="text-[9px] text-surface-500">{s.label}</p>
            </div>
          ))}
        </div>
      </StaggerItem>

      {/* Progress Bar */}
      <StaggerItem>
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-surface-400">Challenge Progress</span>
            <span className="text-xs font-bold text-brand-400">{challenge.completionPct || 0}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
              initial={{ width: 0 }} animate={{ width: `${challenge.completionPct || 0}%` }}
              transition={{ duration: 1 }} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-[10px] text-surface-500">
            <span className="text-green-400">{publishedDays} published</span>
            <span className="text-purple-400">{scheduledDays} scheduled</span>
            <span>{pendingDays} pending</span>
          </div>
        </div>
      </StaggerItem>

      {/* Today's Content */}
      <StaggerItem>
        <GlassCard glow className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-surface-100">Today's Content</h3>
            {todayEntry && todayEntry.status !== 'rest' && (
              <button onClick={handleGenerateToday} disabled={generatingToday || todayEntry.status === 'published' || todayEntry.status === 'scheduled'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs text-brand-400 hover:bg-brand-500/20 transition-all disabled:opacity-40">
                {generatingToday ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {todayEntry.status === 'published' ? 'Published' : todayEntry.status === 'scheduled' ? 'Scheduled' : generatingToday ? 'Generating...' : 'Generate Now'}
              </button>
            )}
          </div>
          {todayEntry ? (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', STATUS_COLORS[todayEntry.status])}>
                  {todayEntry.status}
                </span>
                <span className="text-[10px] text-surface-500">{todayEntry.dayOfWeek}</span>
              </div>
              <p className="text-sm font-medium text-surface-200 mb-1">{todayEntry.contentType?.replace(/_/g, ' ')}</p>
              <p className="text-xs text-surface-400">{todayEntry.topic}</p>
              {todayEntry.status === 'failed' && todayEntry.error && (
                <p className="text-[10px] text-red-400 mt-2">{todayEntry.error}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-surface-500 text-center py-4">No content scheduled for today (rest day)</p>
          )}
        </GlassCard>
      </StaggerItem>

      {/* Batch Generate */}
      <StaggerItem>
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-surface-100">Batch Generate</h3>
              <p className="text-[11px] text-surface-500">Generate content for upcoming days</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={batchCount} onChange={e => setBatchCount(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-surface-300 focus:outline-none">
                {[3, 5, 7, 14, 30].map(n => <option key={n} value={n}>{n} days</option>)}
              </select>
              <button onClick={handleGenerateBatch} disabled={generatingBatch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs text-brand-400 hover:bg-brand-500/20 transition-all disabled:opacity-40">
                {generatingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {generatingBatch ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Upcoming Week */}
      <StaggerItem>
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-surface-100 mb-3">This Week</h3>
          <div className="space-y-2">
            {upcoming.slice(0, 7).map((entry: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded w-16 text-center', STATUS_COLORS[entry.status])}>
                  {entry.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-surface-200 truncate">{entry.topic}</p>
                  <p className="text-[10px] text-surface-500">{entry.dayOfWeek} — {entry.contentType?.replace(/_/g, ' ')}</p>
                </div>
                <span className="text-[10px] text-surface-600">
                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </StaggerItem>

      {/* 90-Day Calendar Overview */}
      <StaggerItem>
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-surface-100 mb-3">90-Day Calendar</h3>
          <div className="grid grid-cols-10 md:grid-cols-15 gap-1">
            {calendar.map((day: any, i: number) => (
              <div key={i}
                className={cn('w-full aspect-square rounded-sm flex items-center justify-center text-[8px] font-medium transition-all',
                  day.status === 'published' ? 'bg-green-500/20 text-green-400' :
                  day.status === 'scheduled' ? 'bg-purple-500/20 text-purple-400' :
                  day.status === 'generated' ? 'bg-blue-500/20 text-blue-400' :
                  day.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  day.status === 'generating' ? 'bg-amber-500/20 text-amber-400' :
                  day.status === 'rest' ? 'bg-surface-800/50 text-surface-700' :
                  'bg-surface-800 text-surface-600')}
                title={`Day ${day.day}: ${day.topic || 'rest'}`}>
                {day.day}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[9px] text-surface-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/20" /> Published</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500/20" /> Scheduled</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/20" /> Generated</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-surface-800" /> Pending</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-surface-800/50" /> Rest</span>
          </div>
        </GlassCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
