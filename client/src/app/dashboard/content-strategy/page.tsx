'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronRight, TrendingUp, Sparkles, BookOpen, Target,
  Lightbulb, Clock, Zap, BarChart3, Loader2, ArrowRight, Calendar,
  CheckCircle2, XCircle, AlertTriangle, Share2, Plus, Send, PenTool,
  FileText, Hash, MessageSquare, Brain, Flame, Eye, Users,
  Rocket, Star, Award, Code2, Briefcase, GraduationCap, ExternalLink,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ContentIntelligence {
  contentPillars: { name: string; score: number; topics: string[]; description: string; percentage: number }[];
  roadmap: { period: string; title: string; focus: string; topics: string[]; contentTypes: string[]; goal: string; expectedOutcome: string }[];
  weeklyCalendar: { day: string; type: string; description: string; pillar: string; difficulty: string }[];
  trendingTopics: { topic: string; relevance: number; category: string }[];
  contentGaps: { covered: string[]; missing: string[] };
  seriesIdeas: { title: string; description: string; topics: string[]; schedule: string; estimatedReach: string; difficulty: string }[];
  postIdeas: { idea: string; type: string; pillar: string; difficulty: string; engagement: string }[];
  performanceInsights: any;
  contentGoals: { goal: string; description: string; target: string; progress: number; priority: string }[];
  opportunities: { opportunity: string; description: string; impact: string; effort: string }[];
  upcomingSchedule: { topic: string; scheduledDate: string; stage: string; pillar: string }[];
  profileSummary: { skills: number; certifications: number; projects: number; experience: number; githubConnected: boolean };
}

function SectionHeader({ title, subtitle, expanded, onToggle, count, icon: Icon }: {
  title: string; subtitle?: string; expanded: boolean; onToggle: () => void; count?: number; icon?: any;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between group">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="w-4 h-4 text-brand-400" />}
        <h3 className="text-sm font-semibold text-surface-100 group-hover:text-white transition-colors">{title}</h3>
        {count !== undefined && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-800 text-surface-400 font-medium">{count}</span>
        )}
        {subtitle && <span className="text-[11px] text-surface-500 hidden sm:inline">— {subtitle}</span>}
      </div>
      <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronDown className="w-4 h-4 text-surface-500" />
      </motion.div>
    </button>
  );
}

function PillarBar({ pillar, index }: { pillar: any; index: number }) {
  const colors = ['from-blue-500 to-cyan-500', 'from-purple-500 to-violet-500', 'from-green-500 to-emerald-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500', 'from-teal-500 to-cyan-500'];
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
      className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-surface-200">{pillar.name}</span>
        <span className="text-[11px] font-bold text-brand-400">{pillar.percentage}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
        <motion.div className={cn('h-full rounded-full bg-gradient-to-r', colors[index % colors.length])}
          initial={{ width: 0 }} animate={{ width: `${pillar.percentage}%` }}
          transition={{ duration: 1, delay: 0.3 + index * 0.1 }} />
      </div>
      <div className="flex flex-wrap gap-1">
        {pillar.topics?.slice(0, 3).map((t: string, i: number) => (
          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-surface-800 text-surface-400">{t}</span>
        ))}
      </div>
    </motion.div>
  );
}

export default function ContentStrategyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ContentIntelligence | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    pillars: true, roadmap: true, calendar: true, trending: true,
    gaps: true, series: true, ideas: true, performance: true,
    goals: true, opportunities: true, schedule: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.contentIntelligence.get();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content intelligence');
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
        <p className="text-surface-400 text-sm">Generating your content strategy...</p>
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

  return (
    <StaggerContainer className="space-y-5">
      {/* Header */}
      <StaggerItem>
        <div>
          <h1 className="text-xl font-bold text-surface-100 mb-0.5">Content Strategy</h1>
          <p className="text-surface-500 text-sm">AI-powered content intelligence from your real data</p>
        </div>
      </StaggerItem>

      {/* Profile Summary Bar */}
      <StaggerItem>
        <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
          <div className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-brand-400" /><span className="text-surface-300">{data.profileSummary.skills} Skills</span></div>
          <div className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-amber-400" /><span className="text-surface-300">{data.profileSummary.certifications} Certs</span></div>
          <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-green-400" /><span className="text-surface-300">{data.profileSummary.projects} Projects</span></div>
          <div className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-purple-400" /><span className="text-surface-300">{data.profileSummary.experience} Roles</span></div>
          {data.profileSummary.githubConnected && (
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /><span className="text-surface-300">GitHub</span></div>
          )}
        </div>
      </StaggerItem>

      {/* 1. AI Content Pillars */}
      <StaggerItem>
        <GlassCard glow className="p-5">
          <SectionHeader title="AI Content Pillars" subtitle="Generated from your profile"
            expanded={expanded.pillars} onToggle={() => toggle('pillars')} icon={Target} />
          <AnimatePresence>
            {expanded.pillars && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="space-y-4 mt-4">
                  {data.contentPillars.map((pillar, i) => (
                    <PillarBar key={i} pillar={pillar} index={i} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 2. Smart Content Roadmap */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Smart Content Roadmap" subtitle="30 / 60 / 90 day plan"
            expanded={expanded.roadmap} onToggle={() => toggle('roadmap')} icon={Rocket} />
          <AnimatePresence>
            {expanded.roadmap && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  {data.roadmap.map((phase, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                          i === 0 ? 'bg-blue-500/10 text-blue-400' : i === 1 ? 'bg-purple-500/10 text-purple-400' : 'bg-green-500/10 text-green-400')}>
                          {phase.period}
                        </span>
                        <span className="text-xs font-semibold text-surface-200">{phase.title}</span>
                      </div>
                      <p className="text-[11px] text-surface-400 mb-2">{phase.focus}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {phase.contentTypes.map((ct, j) => (
                          <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400">{ct}</span>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3 h-3 text-green-400" />
                          <span className="text-[11px] text-surface-300">{phase.goal}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3 text-brand-400" />
                          <span className="text-[11px] text-surface-400">{phase.expectedOutcome}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 3. AI Weekly Content Calendar */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Weekly Content Calendar" subtitle="Personalized for you"
            expanded={expanded.calendar} onToggle={() => toggle('calendar')} icon={Calendar} />
          <AnimatePresence>
            {expanded.calendar && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2 mt-4">
                  {data.weeklyCalendar.map((day, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-[10px] font-bold uppercase text-surface-500 mb-1">{day.day}</p>
                      <p className="text-xs font-semibold text-surface-200 mb-1">{day.type}</p>
                      <p className="text-[10px] text-surface-500 leading-relaxed">{day.description}</p>
                      <span className={cn('text-[8px] px-1.5 py-0.5 rounded-full mt-1.5 inline-block font-medium',
                        day.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                        day.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400')}>
                        {day.difficulty}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 4. Trending Topics */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Trending Topics" subtitle="In your industry"
            expanded={expanded.trending} onToggle={() => toggle('trending')} icon={Flame}
            count={data.trendingTopics.length} />
          <AnimatePresence>
            {expanded.trending && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
                  {data.trendingTopics.map((topic, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center hover:bg-white/[0.04] transition-all cursor-pointer group">
                      <p className="text-xs font-semibold text-surface-200 group-hover:text-white transition-colors">{topic.topic}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <div className="h-1 flex-1 rounded-full bg-surface-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                            style={{ width: `${topic.relevance}%` }} />
                        </div>
                        <span className="text-[9px] text-surface-500">{topic.relevance}%</span>
                      </div>
                      <span className="text-[8px] text-surface-600 uppercase mt-1 inline-block">{topic.category}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 5. Content Gap Analysis */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Content Gap Analysis" subtitle="What to post about"
            expanded={expanded.gaps} onToggle={() => toggle('gaps')} icon={BarChart3} />
          <AnimatePresence>
            {expanded.gaps && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                    <p className="text-[10px] font-bold uppercase text-green-400 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> You're Posting About
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.contentGaps.covered.map((item, i) => (
                        <span key={i} className="text-[11px] px-2 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">{item}</span>
                      ))}
                      {data.contentGaps.covered.length === 0 && (
                        <span className="text-[11px] text-surface-500">Start posting to see coverage</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                    <p className="text-[10px] font-bold uppercase text-red-400 mb-2 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Missing
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.contentGaps.missing.map((item, i) => (
                        <span key={i} className="text-[11px] px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 6. Content Series Generator */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="30-Day Series Ideas" subtitle="Ready to launch"
            expanded={expanded.series} onToggle={() => toggle('series')} icon={BookOpen}
            count={data.seriesIdeas.length} />
          <AnimatePresence>
            {expanded.series && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {data.seriesIdeas.map((series, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                        <span className="text-sm font-semibold text-surface-200">{series.title}</span>
                      </div>
                      <p className="text-[11px] text-surface-500 mb-2">{series.description}</p>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-surface-400">{series.schedule}</span>
                        <span className="text-green-400">{series.estimatedReach}</span>
                        <span className={cn('px-1.5 py-0.5 rounded',
                          series.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                          series.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400')}>{series.difficulty}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 7. AI Post Idea Bank */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="AI Post Idea Bank" subtitle="Personalized ideas from your profile"
            expanded={expanded.ideas} onToggle={() => toggle('ideas')} icon={Lightbulb}
            count={data.postIdeas.length} />
          <AnimatePresence>
            {expanded.ideas && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 max-h-[400px] overflow-y-auto pr-1">
                  {data.postIdeas.slice(0, 30).map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                      <span className="text-[10px] text-surface-500 w-5 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-surface-200 truncate">{item.idea}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400">{item.type}</span>
                          <span className={cn('text-[8px] px-1.5 py-0.5 rounded',
                            item.engagement === 'very high' ? 'bg-green-500/10 text-green-400' :
                            item.engagement === 'high' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-surface-500/10 text-surface-400')}>{item.engagement} engagement</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 8. Content Performance Insights */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Performance Insights" subtitle="Based on your activity"
            expanded={expanded.performance} onToggle={() => toggle('performance')} icon={BarChart3} />
          <AnimatePresence>
            {expanded.performance && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {[
                    { label: 'Best Topic', value: data.performanceInsights.bestPerformingTopic, icon: Star },
                    { label: 'Best Content Type', value: data.performanceInsights.bestContentType, icon: PenTool },
                    { label: 'Best Time', value: data.performanceInsights.bestPublishingTime, icon: Clock },
                    { label: 'Engagement Rate', value: data.performanceInsights.engagementRate, icon: TrendingUp },
                    { label: 'Consistency Score', value: `${data.performanceInsights.consistencyScore}%`, icon: Flame },
                    { label: 'Posting Streak', value: `${data.performanceInsights.postingStreak} weeks`, icon: Zap },
                    { label: 'Total Posts', value: data.performanceInsights.totalPosts, icon: FileText },
                    { label: 'Audience Growth', value: data.performanceInsights.audienceGrowth, icon: Users },
                  ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <stat.icon className="w-4 h-4 text-brand-400 mx-auto mb-1" />
                      <p className="text-[10px] text-surface-500 mb-0.5">{stat.label}</p>
                      <p className="text-xs font-semibold text-surface-200">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 9. Content Goals */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Content Goals" subtitle="Track your progress"
            expanded={expanded.goals} onToggle={() => toggle('goals')} icon={Target}
            count={data.contentGoals.length} />
          <AnimatePresence>
            {expanded.goals && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="space-y-2.5 mt-4">
                  {data.contentGoals.map((goal, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Target className="w-3.5 h-3.5 text-brand-400" />
                          <span className="text-sm font-medium text-surface-200">{goal.goal}</span>
                        </div>
                        <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                          goal.priority === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400')}>
                          {goal.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-surface-500 mb-2">{goal.description}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                          <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                            initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }}
                            transition={{ duration: 1, delay: 0.3 }} />
                        </div>
                        <span className="text-[10px] text-surface-400 w-16 text-right">{goal.target}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 10. Content Opportunities */}
      <StaggerItem>
        <GlassCard className="p-5">
          <SectionHeader title="Content Opportunities" subtitle="Quick wins from your profile"
            expanded={expanded.opportunities} onToggle={() => toggle('opportunities')} icon={Zap}
            count={data.opportunities.length} />
          <AnimatePresence>
            {expanded.opportunities && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="space-y-2 mt-4">
                  {data.opportunities.map((opp, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="w-3.5 h-3.5 text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-200">{opp.opportunity}</p>
                        <p className="text-[11px] text-surface-500 mt-0.5">{opp.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                            opp.impact === 'very high' || opp.impact === 'high' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400')}>
                            {opp.impact} impact
                          </span>
                          <span className="text-[9px] text-surface-500">Effort: {opp.effort}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 11. Upcoming Schedule */}
      {data.upcomingSchedule.length > 0 && (
        <StaggerItem>
          <GlassCard className="p-5">
            <SectionHeader title="Upcoming Schedule" subtitle="From Publishing Center"
              expanded={expanded.schedule} onToggle={() => toggle('schedule')} icon={Clock}
              count={data.upcomingSchedule.length} />
            <AnimatePresence>
              {expanded.schedule && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="space-y-2 mt-4">
                    {data.upcomingSchedule.map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <Calendar className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-200 truncate">{item.topic}</p>
                          <p className="text-[10px] text-surface-500">
                            {new Date(item.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                          item.stage === 'scheduled' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400')}>
                          {item.stage}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}
