'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  BookOpen,
  Users,
  Globe,
  TrendingUp,
  Briefcase,
  Lightbulb,
  Loader2,
  type LucideIcon,
  Compass,
  GraduationCap,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type CareerStatus = {
  careerGoal: { exists: boolean; primaryGoal: string | null; targetRole: string | null; version: number; status: string | null };
  careerBlueprint: { exists: boolean; currentPosition: string | null; targetPosition: string | null; progress: number; milestones: number };
  skillGap: { exists: boolean; totalGaps: number; criticalGaps: number; readinessScore: number };
  opportunityForecast: { exists: boolean; avgProbability: number; readinessScore: number };
  authorityMap: { exists: boolean; ownedTopics: number };
  networking: { exists: boolean; totalTargets: number };
  milestones: { total: number };
};

const GOAL_LABELS: Record<string, string> = {
  internship: 'Internship Search',
  job_search: 'Job Search',
  freelancing: 'Freelancing',
  startup: 'Startup Growth',
  personal_branding: 'Personal Branding',
  thought_leadership: 'Thought Leadership',
  career_change: 'Career Change',
  networking: 'Networking',
  skill_development: 'Skill Development',
};

export default function CareerPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [status, setStatus] = useState<CareerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const stateRes = await api.onboarding.getState();
        const uid = stateRes.state.userId;
        setUserId(uid);

        const st = await api.career.getStatus(uid);
        setStatus(st);

        if (st.careerBlueprint.exists) {
          const bp = await api.career.getBlueprint(uid);
          setReport({ blueprint: bp });
        }
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

      const linkedinProfile = state.connectedSources?.linkedin?.profileData;
      const resumeData = state.connectedSources?.resume?.parsedData;

      const profileData = {
        headline: linkedinProfile?.headline || resumeData?.headline || '',
        about: linkedinProfile?.about || resumeData?.summary || '',
        experience: linkedinProfile?.experience || resumeData?.experience || [],
        skills: linkedinProfile?.skills || resumeData?.skills || [],
        education: linkedinProfile?.education || resumeData?.education || [],
        certifications: linkedinProfile?.certifications || resumeData?.certifications || [],
        projects: linkedinProfile?.projects || state.connectedSources?.github?.repos?.slice(0, 5) || [],
        targetRole: state.targetRole || undefined,
        targetIndustries: state.targetIndustries || [],
        totalExperienceYears: linkedinProfile?.totalExperienceYears || resumeData?.totalExperienceYears || 0,
      };

      const fullReport = await api.career.generateFullReport(userId, profileData);
      setReport(fullReport);
      const st = await api.career.getStatus(userId);
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
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-2">Something went wrong</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button onClick={handleGenerate} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string | number; sub?: string }) => (
    <GlassCard>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <p className="text-sm text-surface-400">{label}</p>
          <p className="text-xl font-bold text-surface-100">{value}</p>
          {sub && <p className="text-xs text-surface-500 mt-1">{sub}</p>}
        </div>
      </div>
    </GlassCard>
  );

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Career Intelligence</h1>
            <p className="text-surface-400 mt-1">Your AI-powered career growth strategy platform</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-secondary gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', generating && 'animate-spin')} />
              {report ? 'Regenerate Blueprint' : 'Generate Career Blueprint'}
            </button>
          </div>
        </div>
      </StaggerItem>

      {/* Status Cards */}
      <StaggerItem>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Target} label="Career Goal" value={status?.careerGoal.primaryGoal ? GOAL_LABELS[status.careerGoal.primaryGoal] || status.careerGoal.primaryGoal : 'Not set'} sub={status?.careerGoal.targetRole || 'No target role'} />
          <StatCard icon={BarChart3} label="Blueprint Progress" value={status?.careerBlueprint.progress ? `${status.careerBlueprint.progress}%` : '0%'} sub={`${status?.careerBlueprint.milestones || 0} milestones`} />
          <StatCard icon={TrendingUp} label="Readiness Score" value={status?.skillGap.readinessScore ? `${status.skillGap.readinessScore}%` : 'N/A'} sub={`${status?.skillGap.totalGaps || 0} skill gaps`} />
          <StatCard icon={Users} label="Network Targets" value={status?.networking.totalTargets || 0} sub={`${status?.authorityMap.ownedTopics || 0} authority topics`} />
        </div>
      </StaggerItem>

      {!report ? (
        <StaggerItem>
          <GlassCard glow className="text-center p-12 max-w-2xl mx-auto">
            <GradientBorder animate className="inline-flex mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <Compass className="w-10 h-10 text-white" />
              </div>
            </GradientBorder>

            <h1 className="text-2xl font-bold text-surface-100 mb-3">Your Career Blueprint</h1>
            <p className="text-surface-400 mb-8 leading-relaxed">
              Discover your career stage, map opportunities, close skill gaps, and generate a 90-day growth blueprint.
              Powered by your LinkedIn profile, resume, and project data.
            </p>

            <button
              onClick={handleGenerate}
              disabled={generating || !userId}
              className={cn('btn-primary gap-2 px-8 py-3 text-base', (!userId || generating) && 'opacity-50 cursor-not-allowed')}
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Building your blueprint...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate Career Blueprint</>
              )}
            </button>
          </GlassCard>
        </StaggerItem>
      ) : (
        <>
          {/* Career Goal & Stage */}
          <StaggerItem>
            <GlassCard glow className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.03] to-accent-500/[0.03]" />
              <div className="relative p-8 text-center">
                <GradientBorder animate className="inline-flex mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                </GradientBorder>
                <h2 className="text-2xl font-bold text-surface-100 mb-2">
                  {report.goal ? GOAL_LABELS[report.goal.primaryGoal] || report.goal.primaryGoal : status?.careerGoal.primaryGoal || 'Career Growth'}
                </h2>
                <div className="flex items-center justify-center gap-4 text-sm mt-4">
                  {report.goal?.targetRole && (
                    <span className="px-4 py-1.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      Target: {report.goal.targetRole}
                    </span>
                  )}
                  {report.stage?.primaryStage && (
                    <span className="px-4 py-1.5 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20 capitalize">
                      {report.stage.primaryStage.replace('_', ' ')}
                    </span>
                  )}
                  {report.stage?.confidence && (
                    <span className="px-4 py-1.5 rounded-full bg-surface-800 text-surface-400">
                      {Math.round(report.stage.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
              </div>
            </GlassCard>
          </StaggerItem>

          {/* Opportunity Map */}
          {report.opportunityMap && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Opportunity Map" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass rounded-xl p-5 border border-white/5">
                    <p className="text-xs text-surface-400 mb-1">Current Position</p>
                    <p className="text-lg font-semibold text-surface-100 capitalize">{report.opportunityMap.currentPosition.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="glass rounded-xl p-5 border border-white/5">
                    <p className="text-xs text-surface-400 mb-1">Target Position</p>
                    <p className="text-lg font-semibold text-accent-400 capitalize">{report.opportunityMap.targetPosition.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                {report.opportunityMap.gaps?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-surface-300 mb-3">Identified Gaps</h4>
                    <div className="space-y-3">
                      {report.opportunityMap.gaps.map((gap: any, i: number) => (
                        <div key={i} className="glass rounded-xl p-4 border border-white/5">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded text-xs font-semibold',
                              gap.severity === 'critical' && 'bg-red-500/10 text-red-400',
                              gap.severity === 'high' && 'bg-amber-500/10 text-amber-400',
                              gap.severity === 'medium' && 'bg-brand-500/10 text-brand-400',
                              gap.severity === 'low' && 'bg-surface-800 text-surface-400',
                            )}>
                              {gap.severity}
                            </span>
                            <span className="text-sm text-surface-300 capitalize">{gap.category}</span>
                          </div>
                          <p className="text-sm text-surface-400 mb-2">{gap.gap}</p>
                          <ul className="space-y-1">
                            {gap.suggestedActions?.slice(0, 3).map((action: string, j: number) => (
                              <li key={j} className="text-xs text-surface-500 flex items-start gap-2">
                                <span className="text-accent-400 mt-0.5">→</span> {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </StaggerItem>
          )}

          {/* Skill Gap Report */}
          {report.skillGap && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Skill Gap Analysis" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="glass rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-2xl font-bold text-surface-100">{report.skillGap.summary.totalGaps}</p>
                    <p className="text-xs text-surface-400">Total Gaps</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-2xl font-bold text-red-400">{report.skillGap.summary.criticalGaps}</p>
                    <p className="text-xs text-surface-400">Critical</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-2xl font-bold text-amber-400">{report.skillGap.summary.highPriorityGaps}</p>
                    <p className="text-xs text-surface-400">High Priority</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-2xl font-bold text-accent-400">{report.skillGap.summary.readinessScore}%</p>
                    <p className="text-xs text-surface-400">Readiness</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {report.skillGap.skills?.slice(0, 8).map((skill: any, i: number) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-surface-300">{skill.skill}</span>
                          <span className="text-surface-400">
                            {skill.currentLevel}/{skill.targetLevel}
                            {skill.marketDemand === 'high' && <span className="text-accent-400 ml-2">High demand</span>}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${(skill.currentLevel / skill.targetLevel) * 100}%` }} />
                        </div>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                        skill.gap >= 5 ? 'bg-red-500/10 text-red-400' :
                        skill.gap >= 3 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-accent-500/10 text-accent-400'
                      )}>
                        Gap: {skill.gap}
                      </span>
                    </div>
                  ))}
                </div>
                {report.skillGap.recommendations?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-surface-300 mb-3">Recommendations</h4>
                    <ul className="space-y-2">
                      {report.skillGap.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-sm text-surface-400 flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" /> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </GlassCard>
            </StaggerItem>
          )}

          {/* Content to Career Map */}
          {report.contentMap && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Content to Career Map" />
                <div className="space-y-4">
                  {report.contentMap.recommendedContentTypes?.map((ct: any, i: number) => (
                    <div key={i} className="glass rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-surface-200">{ct.type}</h4>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          ct.estimatedImpact === 'high' ? 'bg-accent-500/10 text-accent-400' :
                          ct.estimatedImpact === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-surface-800 text-surface-400'
                        )}>
                          {ct.estimatedImpact} impact
                        </span>
                      </div>
                      <p className="text-sm text-surface-400 mb-2">{ct.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {ct.examples?.map((ex: string, j: number) => (
                          <span key={j} className="text-xs bg-surface-800 text-surface-400 px-2 py-1 rounded">{ex}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {report.contentMap.strategy && (
                  <div className="mt-6 glass rounded-xl p-4 border border-brand-500/20">
                    <h4 className="text-sm font-semibold text-brand-400 mb-2">Content Strategy</h4>
                    <p className="text-sm text-surface-300">{report.contentMap.strategy}</p>
                  </div>
                )}
              </GlassCard>
            </StaggerItem>
          )}

          {/* Authority Map */}
          {report.authority && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Authority Map" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="glass rounded-xl p-4 border border-emerald-500/20 text-center">
                    <p className="text-lg font-bold text-emerald-400">{report.authority.summary.ownedTopics}</p>
                    <p className="text-xs text-surface-400">Topics to Own</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-amber-500/20 text-center">
                    <p className="text-lg font-bold text-amber-400">{report.authority.summary.adjacentTopics}</p>
                    <p className="text-xs text-surface-400">Adjacent Topics</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-red-500/20 text-center">
                    <p className="text-lg font-bold text-red-400">{report.authority.summary.avoidedTopics}</p>
                    <p className="text-xs text-surface-400">Topics to Avoid</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {report.authority.topics?.filter((t: any) => t.category !== 'avoid').slice(0, 8).map((topic: any, i: number) => (
                    <div key={i} className="flex items-center justify-between glass rounded-lg px-4 py-3 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full', topic.category === 'own' ? 'bg-emerald-400' : 'bg-amber-400')} />
                        <span className="text-sm text-surface-300">{topic.topic}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${topic.currentAuthority}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                          />
                        </div>
                        <span className="text-xs text-surface-400 w-8">{topic.currentAuthority}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </StaggerItem>
          )}

          {/* Opportunity Forecast */}
          {report.forecast && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Opportunity Forecast" />
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="glass rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-lg font-bold text-surface-100">{report.forecast.summary.threeMonthOpportunities}</p>
                    <p className="text-xs text-surface-400">3 Month</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-lg font-bold text-surface-100">{report.forecast.summary.sixMonthOpportunities}</p>
                    <p className="text-xs text-surface-400">6 Month</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-lg font-bold text-surface-100">{report.forecast.summary.twelveMonthOpportunities}</p>
                    <p className="text-xs text-surface-400">12 Month</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {report.forecast.forecasts?.map((f: any, i: number) => (
                    <div key={i} className="flex items-center justify-between glass rounded-xl p-4 border border-white/5">
                      <div className="flex-1">
                        <p className="text-sm text-surface-200">{f.opportunity}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-surface-500 capitalize">{f.type.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-surface-500">•</span>
                          <span className="text-xs text-surface-500">{f.timeframe.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          'text-lg font-bold',
                          f.probability >= 0.7 ? 'text-accent-400' :
                          f.probability >= 0.4 ? 'text-amber-400' : 'text-red-400'
                        )}>
                          {Math.round(f.probability * 100)}%
                        </p>
                        <p className="text-xs text-surface-500">probability</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </StaggerItem>
          )}

          {/* Career Blueprint (90-Day Plan) */}
          {report.blueprint && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="90-Day Career Growth Blueprint" />
                <div className="flex items-center gap-4 mb-6">
                  <div className="glass rounded-xl px-4 py-2 border border-white/5">
                    <span className="text-xs text-surface-400">From: </span>
                    <span className="text-sm text-surface-200 capitalize">{report.blueprint.currentPosition?.replace(/_/g, ' ')}</span>
                  </div>
                  <TrendingUp className="w-4 h-4 text-accent-400" />
                  <div className="glass rounded-xl px-4 py-2 border border-accent-500/20">
                    <span className="text-xs text-accent-400">To: </span>
                    <span className="text-sm text-accent-300 capitalize">{report.blueprint.targetPosition?.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                {/* Milestones Timeline */}
                {report.blueprint.milestones?.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-sm font-semibold text-surface-300 mb-4">Milestone Timeline</h4>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-500 to-accent-500" />
                      <div className="space-y-6">
                        {report.blueprint.milestones.map((ms: any, i: number) => (
                          <div key={i} className="relative pl-10">
                            <div className={cn(
                              'absolute left-2.5 w-3 h-3 rounded-full border-2',
                              ms.status === 'completed' ? 'bg-accent-500 border-accent-500' :
                              ms.status === 'in_progress' ? 'bg-brand-500 border-brand-500' :
                              'bg-surface-800 border-surface-600'
                            )} style={{ top: '4px' }} />
                            <div className="glass rounded-xl p-4 border border-white/5">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-semibold text-surface-200">
                                  Week {ms.week}: {ms.title}
                                </h5>
                                <span className={cn(
                                  'text-xs px-2 py-0.5 rounded-full',
                                  ms.status === 'completed' ? 'bg-accent-500/10 text-accent-400' :
                                  ms.status === 'in_progress' ? 'bg-brand-500/10 text-brand-400' :
                                  'bg-surface-800 text-surface-500'
                                )}>
                                  {ms.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs text-surface-400 mb-2">{ms.description}</p>
                              <div className="flex flex-wrap gap-2">
                                {ms.deliverables?.map((d: string, j: number) => (
                                  <span key={j} className="text-xs bg-surface-800 text-surface-500 px-2 py-0.5 rounded">{d}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Blueprint Sections */}
                {report.blueprint.sections && Object.entries(report.blueprint.sections).map(([key, section]: [string, any]) => (
                  <div key={key} className="mb-6">
                    <h4 className="text-sm font-semibold text-surface-300 mb-3">{section.title}</h4>
                    <p className="text-xs text-surface-400 mb-3">{section.description}</p>
                    <div className="space-y-2">
                      {section.tasks?.map((task: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 glass rounded-lg px-4 py-3 border border-white/5">
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                            task.completed ? 'bg-accent-500 border-accent-500' : 'border-surface-600'
                          )}>
                            {task.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <p className={cn('text-sm', task.completed ? 'text-surface-500 line-through' : 'text-surface-200')}>
                              {task.name}
                            </p>
                            <p className="text-xs text-surface-500">{task.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded',
                              task.priority === 'critical' ? 'bg-red-500/10 text-red-400' :
                              task.priority === 'high' ? 'bg-amber-500/10 text-amber-400' :
                              'bg-surface-800 text-surface-500'
                            )}>
                              {task.priority}
                            </span>
                            <span className="text-[10px] text-surface-500">{task.timeframe}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </GlassCard>
            </StaggerItem>
          )}

          {/* Networking */}
          {report.networking && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Networking Intelligence" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-surface-300 mb-3">Target Connections</h4>
                    <div className="space-y-2">
                      {report.networking.targets?.slice(0, 6).map((t: any, i: number) => (
                        <div key={i} className="flex items-center justify-between glass rounded-lg px-4 py-3 border border-white/5">
                          <div>
                            <p className="text-sm text-surface-200">{t.name}</p>
                            <p className="text-xs text-surface-500">{t.reason}</p>
                          </div>
                          <span className="text-xs text-surface-500">{t.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-surface-300 mb-3">Communities</h4>
                    <div className="space-y-2">
                      {report.networking.communities?.map((c: any, i: number) => (
                        <div key={i} className="glass rounded-lg px-4 py-3 border border-white/5">
                          <p className="text-sm text-surface-200">{c.name}</p>
                          <p className="text-xs text-surface-500">{c.platform} — {c.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </StaggerItem>
          )}
        </>
      )}
    </StaggerContainer>
  );
}
