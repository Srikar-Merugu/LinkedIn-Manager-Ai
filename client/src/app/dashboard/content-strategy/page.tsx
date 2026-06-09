'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Target,
  Users,
  BookOpen,
  Globe,
  Lightbulb,
  Clock,
  Zap,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const phaseColors: Record<string, string> = {
  positioning: 'from-blue-500/20 via-cyan-500/20 to-teal-500/20 border-blue-500/30',
  authority: 'from-purple-500/20 via-violet-500/20 to-indigo-500/20 border-purple-500/30',
  opportunity: 'from-amber-500/20 via-orange-500/20 to-rose-500/20 border-amber-500/30',
};

const phaseIcons: Record<string, LucideIcon> = {
  positioning: Users,
  authority: TrendingUp,
  opportunity: Zap,
};

const categoryColors: Record<string, string> = {
  audience: 'bg-blue-500/20 text-blue-400',
  authority: 'bg-purple-500/20 text-purple-400',
  career: 'bg-green-500/20 text-green-400',
  networking: 'bg-cyan-500/20 text-cyan-400',
  content: 'bg-amber-500/20 text-amber-400',
  growth: 'bg-rose-500/20 text-rose-400',
};

const authorityCategoryColors: Record<string, string> = {
  dominate: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  expand: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  explore: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  avoid: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function ContentStrategyPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const load = async () => {
      try {
        const stateRes = await api.onboarding.getState();
        const uid = stateRes.state.userId;
        setUserId(uid);
        const st = await api.contentStrategy.getStatus(uid);
        setStatus(st);
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
      const brand = state.brandDNA || {};
      const writing = state.writingDNA || {};
      const careerGoal = state.careerGoal || {};

      const profileData = {
        headline: linkedin.headline || resume.headline || '',
        about: linkedin.about || resume.summary || '',
        experience: linkedin.experience || resume.experience || [],
        skills: linkedin.skills || resume.skills || [],
        education: linkedin.education || resume.education || [],
        certifications: linkedin.certifications || resume.certifications || [],
        projects: linkedin.projects || state.connectedSources?.github?.repos?.slice(0, 5) || [],
        targetRole: state.targetRole || careerGoal?.targetRole,
        careerGoal,
        brandDNA: brand,
        writingDNA: writing,
        audienceData: { size: linkedin.followers ? (linkedin.followers > 10000 ? 'large' : linkedin.followers > 1000 ? 'medium' : 'small') : 'small' },
      };

      const fullReport = await api.contentStrategy.generateFullReport(userId, profileData);
      setReport(fullReport);
      const st = await api.contentStrategy.getStatus(userId);
      setStatus(st);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Content Strategy
          </h1>
          <p className="text-gray-400 mt-1">Strategic intelligence engine — 90-day content strategy</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !userId}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate Strategy'}
        </button>
      </div>

      {error && (
        <GradientBorder className="border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 p-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        </GradientBorder>
      )}

      {!status?.strategy?.exists && !report && !generating && (
        <GlassCard>
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-cyan-400/50" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">No Strategy Yet</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Generate a 90-day content strategy powered by your profile data, career goals, brand identity, and writing DNA.
            </p>
            <button
              onClick={handleGenerate}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              Generate Your Strategy
            </button>
          </div>
        </GlassCard>
      )}

      {(report || (status?.strategy?.exists && !report)) && (
        <>
          {/* Score Cards */}
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Overall', value: (report?.strategyScore?.overallScore || status?.scores?.overallScore || 0), color: 'from-cyan-500 to-blue-600', icon: BarChart3 },
              { label: 'Authority', value: (report?.strategyScore?.authorityScore?.overall || status?.scores?.authorityScore || 0), color: 'from-purple-500 to-violet-600', icon: TrendingUp },
              { label: 'Opportunity', value: (report?.strategyScore?.opportunityScore?.overall || status?.scores?.opportunityScore || 0), color: 'from-amber-500 to-orange-600', icon: Zap },
              { label: 'Career Fit', value: (report?.strategyScore?.careerAlignmentScore?.overall || status?.scores?.careerAlignmentScore || 0), color: 'from-green-500 to-emerald-600', icon: Target },
              { label: 'Audience Fit', value: (report?.strategyScore?.audienceFitScore?.overall || status?.scores?.audienceFitScore || 0), color: 'from-blue-500 to-indigo-600', icon: Users },
              { label: 'Execution', value: (report?.strategyScore?.executionScore?.overall || status?.scores?.executionScore || 0), color: 'from-rose-500 to-pink-600', icon: CheckCircle2 },
            ].map((item) => (
              <StaggerItem key={item.label}>
                <GradientBorder>
                  <GlassCard>
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2.5 rounded-lg bg-gradient-to-br', item.color)}>
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{item.label}</p>
                        <p className="text-2xl font-bold">{item.value}<span className="text-sm text-gray-500">/100</span></p>
                      </div>
                    </div>
                  </GlassCard>
                </GradientBorder>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
            {[
              { id: 'overview', label: '90-Day Roadmap', icon: Clock },
              { id: 'months', label: 'Monthly Plans', icon: BookOpen },
              { id: 'themes', label: 'Weekly Themes', icon: Lightbulb },
              { id: 'goals', label: 'Growth Goals', icon: Target },
              { id: 'authority', label: 'Authority Roadmap', icon: TrendingUp },
              { id: 'networking', label: 'Networking', icon: Users },
              { id: 'opportunities', label: 'Opportunities', icon: Zap },
              { id: 'scores', label: 'Strategy Score', icon: BarChart3 },
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

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <StaggerContainer className="space-y-6">
              <StaggerItem>
                <GlassCard>
                  <GlassCardHeader title="90-Day Strategic Roadmap" />
                  <div className="space-y-4 mt-4">
                    <p className="text-gray-300 leading-relaxed">
                      {report?.strategy?.overallStrategy?.narrative || 'No strategy narrative available.'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {report?.strategy?.overallStrategy?.monthlyPlans?.map((plan: any, idx: number) => {
                        const PhaseIcon = phaseIcons[plan.phase] || Clock;
                        return (
                          <GradientBorder key={idx} className={cn('border', phaseColors[plan.phase])}>
                            <GlassCard>
                              <div className="flex items-center gap-3 mb-3">
                                <PhaseIcon className="w-5 h-5" />
                                <div>
                                  <p className="text-sm font-semibold capitalize">{plan.phase} Phase</p>
                                  <p className="text-xs text-gray-500">Month {plan.monthNumber}</p>
                                </div>
                              </div>
                              <ul className="space-y-1.5">
                                {plan.goals.slice(0, 2).map((g: any, i: number) => (
                                  <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-cyan-400" />
                                    <span>{g.goal}</span>
                                  </li>
                                ))}
                              </ul>
                            </GlassCard>
                          </GradientBorder>
                        );
                      })}
                    </div>
                  </div>
                </GlassCard>
              </StaggerItem>

              <StaggerItem>
                <GlassCard>
                  <GlassCardHeader title="Content Mix Distribution" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {report?.strategy?.overallStrategy?.monthlyPlans?.map((plan: any, idx: number) => (
                      <div key={idx}>
                        <p className="text-sm font-semibold text-gray-300 mb-2 capitalize">
                          Month {plan.monthNumber} — {plan.phase}
                        </p>
                        <div className="space-y-2">
                          {plan.contentMix.map((mix: any, i: number) => (
                            <div key={i}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">{mix.type}</span>
                                <span className="text-cyan-400 font-medium">{mix.percentage}%</span>
                              </div>
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                  style={{ width: `${mix.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </StaggerItem>
            </StaggerContainer>
          )}

          {/* Monthly Plans Tab */}
          {activeTab === 'months' && (
            <StaggerContainer className="space-y-4">
              {report?.monthlyPlans?.sort((a: any, b: any) => a.monthNumber - b.monthNumber).map((month: any, idx: number) => {
                const PhaseIcon = phaseIcons[month.phase] || Clock;
                return (
                  <StaggerItem key={idx}>
                    <GradientBorder className={cn('border', phaseColors[month.phase])}>
                      <GlassCard>
                        <div className="flex items-center gap-3 mb-4">
                          <PhaseIcon className="w-6 h-6" />
                          <div>
                            <h3 className="text-lg font-semibold capitalize">{month.phase} Phase</h3>
                            <p className="text-sm text-gray-500">Month {month.monthNumber} — {new Date(month.startDate).toLocaleDateString()} to {new Date(month.endDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm font-semibold text-gray-300 mb-2">Goals</p>
                            <div className="space-y-3">
                              {month.goals?.map((g: any, i: number) => (
                                <div key={i} className="p-3 rounded-lg bg-white/5">
                                  <p className="text-sm font-medium text-gray-200">{g.goal}</p>
                                  <p className="text-xs text-gray-500 mt-1">{g.reasoning}</p>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {g.successMetrics?.slice(0, 3).map((m: string, j: number) => (
                                      <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">{m}</span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-300 mb-2">Content Mix</p>
                            <div className="space-y-2">
                              {month.contentMix?.map((mix: any, i: number) => (
                                <div key={i}>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-300">{mix.type}</span>
                                    <span className="text-cyan-400 font-medium">{mix.percentage}%</span>
                                  </div>
                                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                      style={{ width: `${mix.percentage}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">{mix.reasoning}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </GradientBorder>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}

          {/* Weekly Themes Tab */}
          {activeTab === 'themes' && (
            <StaggerContainer className="space-y-4">
              <GlassCard>
                <GlassCardHeader title="12-Week Theme Calendar" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {report?.weeklyThemes?.sort((a: any, b: any) => a.globalWeekNumber - b.globalWeekNumber).map((theme: any, idx: number) => (
                    <GradientBorder key={idx} className={cn('border', phaseColors[theme.monthNumber === 1 ? 'positioning' : theme.monthNumber === 2 ? 'authority' : 'opportunity'])}>
                      <GlassCard>
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            theme.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-500'
                          )}>
                            Week {theme.globalWeekNumber}
                          </span>
                          <span className="text-xs text-gray-500">Month {theme.monthNumber}</span>
                        </div>
                        <h4 className="font-semibold text-sm">{theme.title}</h4>
                        <p className="text-xs text-gray-400 mt-1">{theme.focus}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{theme.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {theme.contentIdeas?.slice(0, 2).map((idea: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 truncate max-w-[140px]">{idea}</span>
                          ))}
                        </div>
                      </GlassCard>
                    </GradientBorder>
                  ))}
                </div>
              </GlassCard>
            </StaggerContainer>
          )}

          {/* Growth Goals Tab */}
          {activeTab === 'goals' && (
            <StaggerContainer className="space-y-4">
              <GlassCard>
                <GlassCardHeader title="Growth Goals" description="6 categories of strategic objectives" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {report?.growthGoals?.map((goal: any, idx: number) => (
                    <StaggerItem key={idx}>
                      <GlassCard className="h-full">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', categoryColors[goal.category] || 'bg-gray-500/20 text-gray-400')}>
                            {goal.category}
                          </span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            goal.priority === 'critical' ? 'bg-red-500/20 text-red-400' : goal.priority === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'
                          )}>
                            {goal.priority}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm text-gray-200">{goal.goal}</h4>
                        <p className="text-xs text-gray-500 mt-2">{goal.reasoning}</p>
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-400 mb-1">Success Metrics</p>
                          <div className="flex flex-wrap gap-1.5">
                            {goal.successMetrics?.map((m: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">{m}</span>
                            ))}
                          </div>
                        </div>
                      </GlassCard>
                    </StaggerItem>
                  ))}
                </div>
              </GlassCard>
            </StaggerContainer>
          )}

          {/* Authority Roadmap Tab */}
          {activeTab === 'authority' && (
            <StaggerContainer className="space-y-4">
              <GlassCard>
                <GlassCardHeader title="Authority Roadmap" description={`Projected authority: ${report?.authorityRoadmap?.overallAuthorityProjection || status?.authorityRoadmap?.overallProjection}/100`} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  {['dominate', 'expand', 'explore', 'avoid'].map((category) => {
                    const topics = report?.authorityRoadmap?.topics?.filter((t: any) => t.category === category) || [];
                    if (topics.length === 0) return null;
                    return (
                      <div key={category}>
                        <h4 className={cn(
                          'text-sm font-semibold mb-3 capitalize px-3 py-1 rounded-lg inline-block',
                          category === 'dominate' ? 'text-emerald-400 bg-emerald-500/10' :
                          category === 'expand' ? 'text-blue-400 bg-blue-500/10' :
                          category === 'explore' ? 'text-amber-400 bg-amber-500/10' :
                          'text-red-400 bg-red-500/10'
                        )}>
                          {category} ({topics.length})
                        </h4>
                        <div className="space-y-2">
                          {topics.map((topic: any, i: number) => (
                            <GlassCard key={i}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-200">{topic.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{topic.currentAuthority}</span>
                                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      topic.category === 'dominate' ? 'bg-emerald-500' :
                                      topic.category === 'expand' ? 'bg-blue-500' :
                                      topic.category === 'explore' ? 'bg-amber-500' : 'bg-red-500'
                                    )}
                                    style={{ width: `${(topic.currentAuthority / (topic.targetAuthority || 100)) * 100}%` }}
                                  />
                                </div>
                                <span className="text-cyan-400">{topic.targetAuthority}</span>
                              </div>
                            </GlassCard>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </StaggerContainer>
          )}

          {/* Networking Tab */}
          {activeTab === 'networking' && (
            <StaggerContainer className="space-y-4">
              <GlassCard>
                <GlassCardHeader title="Networking Strategy" description={`Projected: ${report?.networkingPlan?.reach?.projectedNewConnections || 0} new connections`} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Engagement Targets</h4>
                    <div className="space-y-2">
                      {report?.networkingPlan?.targets?.map((t: any, i: number) => (
                        <GlassCard key={i}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 capitalize">{t.type.replace('_', ' ')}</span>
                          </div>
                          <p className="text-xs text-gray-400">{t.rationale}</p>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Weekly Engagement Plan</h4>
                    <div className="space-y-2">
                      {report?.networkingPlan?.weeklyEngagementPlan?.slice(0, 4).map((w: any, i: number) => (
                        <GlassCard key={i}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-cyan-400">Week {w.week}</span>
                            <span className="text-xs text-gray-400">{w.focus}</span>
                          </div>
                          <ul className="space-y-0.5">
                            {w.actions?.slice(0, 2).map((a: string, j: number) => (
                              <li key={j} className="text-xs text-gray-500 flex items-start gap-1.5">
                                <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-green-400" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </StaggerContainer>
          )}

          {/* Opportunities Tab */}
          {activeTab === 'opportunities' && (
            <StaggerContainer className="space-y-4">
              <GlassCard>
                <GlassCardHeader title="Opportunity Plan" description="Content that attracts specific opportunities" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Opportunity Forecast</h4>
                    <div className="space-y-3">
                      {report?.opportunityPlan?.opportunityForecast?.map((opp: any, i: number) => (
                        <GlassCard key={i}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-200">{opp.opportunityType}</span>
                            <span className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full',
                              opp.probability >= 70 ? 'bg-green-500/20 text-green-400' :
                              opp.probability >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                            )}>
                              {opp.probability}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <Clock className="w-3 h-3" />
                            <span>{opp.timeframe}</span>
                          </div>
                          <p className="text-xs text-gray-400">{opp.contentLever}</p>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">High-Impact Content</h4>
                    <div className="space-y-3">
                      {report?.opportunityPlan?.highImpactContent?.map((hc: any, i: number) => (
                        <GlassCard key={i}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-medium',
                              hc.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                              hc.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'
                            )}>
                              {hc.priority}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-200">{hc.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{hc.rationale}</p>
                          <p className="text-xs text-cyan-400 mt-1">{hc.targetOutcome}</p>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </StaggerContainer>
          )}

          {/* Strategy Score Tab */}
          {activeTab === 'scores' && (
            <StaggerContainer className="space-y-4">
              <GlassCard>
                <GlassCardHeader title="Strategy Score Breakdown" description="5-dimension scoring with recommendations" />
                <div className="space-y-6 mt-4">
                  {[
                    { label: 'Authority Score', score: report?.strategyScore?.authorityScore, color: 'from-purple-500 to-violet-600' },
                    { label: 'Opportunity Score', score: report?.strategyScore?.opportunityScore, color: 'from-amber-500 to-orange-600' },
                    { label: 'Career Alignment Score', score: report?.strategyScore?.careerAlignmentScore, color: 'from-green-500 to-emerald-600' },
                    { label: 'Audience Fit Score', score: report?.strategyScore?.audienceFitScore, color: 'from-blue-500 to-indigo-600' },
                    { label: 'Execution Score', score: report?.strategyScore?.executionScore, color: 'from-rose-500 to-pink-600' },
                  ].map((dim, idx) => {
                    const s = dim.score;
                    if (!s) return null;
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-200">{dim.label}</h4>
                          <span className="text-lg font-bold">{s.overall}<span className="text-sm text-gray-500">/100</span></span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                          <div
                            className={cn('h-full rounded-full bg-gradient-to-r', dim.color)}
                            style={{ width: `${s.overall}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(s.subScores || {}).map(([key, val]) => (
                            <div key={key} className="p-2 rounded-lg bg-white/5">
                              <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <p className="text-sm font-medium">{val as number}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              {report?.strategyScore?.recommendations?.length > 0 && (
                <GlassCard>
                  <GlassCardHeader title="Recommendations" />
                  <ul className="space-y-2 mt-4">
                    {report.strategyScore.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                        <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                        <span className="text-sm text-gray-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}
            </StaggerContainer>
          )}
        </>
      )}
    </div>
  );
}
