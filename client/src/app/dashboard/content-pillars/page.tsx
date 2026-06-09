'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Layout,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  BookOpen,
  Hash,
  TrendingUp,
  Target,
  Loader2,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ContentPillarsPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const stateRes = await api.onboarding.getState();
        const uid = stateRes.state.userId;
        setUserId(uid);

        const st = await api.contentPillars.getStatus(uid);
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

      const profileData = {
        headline: linkedin.headline || resume.headline || '',
        about: linkedin.about || resume.summary || '',
        experience: linkedin.experience || resume.experience || [],
        skills: linkedin.skills || resume.skills || [],
        education: linkedin.education || resume.education || [],
        certifications: linkedin.certifications || resume.certifications || [],
        projects: linkedin.projects || state.connectedSources?.github?.repos?.slice(0, 5) || [],
        targetRole: state.targetRole || undefined,
      };

      const fullReport = await api.contentPillars.generateFullReport(userId, profileData);
      setReport(fullReport);
      const st = await api.contentPillars.getStatus(userId);
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
        <div><div className="skeleton h-8 w-48 mb-2" /><div className="skeleton h-4 w-72" /></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
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
            <h1 className="text-2xl font-bold text-surface-100">Content Pillar Intelligence</h1>
            <p className="text-surface-400 mt-1">AI-powered content authority areas personalized to your brand</p>
          </div>
          <button onClick={handleGenerate} disabled={generating} className="btn-secondary gap-2">
            <RefreshCw className={cn('w-4 h-4', generating && 'animate-spin')} />
            {report ? 'Regenerate' : 'Generate Pillars'}
          </button>
        </div>
      </StaggerItem>

      {status && (
        <StaggerItem>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Layers} label="Content Pillars" value={status.pillars?.total || 0} sub={status.pillars?.hasClusters ? 'with topic clusters' : 'no clusters yet'} />
            <StatCard icon={BarChart3} label="Authority Areas" value={(status.authority?.strongAreas || 0) + (status.authority?.growingAreas || 0)} sub={`${status.authority?.strongAreas || 0} strong`} />
            <StatCard icon={TrendingUp} label="Posts/Week" value={status.distribution?.totalPostsPerWeek || 0} sub={status.distribution?.primaryPillar || 'no distribution'} />
            <StatCard icon={Hash} label="Snapshots" value={status.snapshots?.total || 0} sub="version history" />
          </div>
        </StaggerItem>
      )}

      {!report ? (
        <StaggerItem>
          <GlassCard glow className="text-center p-12 max-w-2xl mx-auto">
            <GradientBorder animate className="inline-flex mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <Layout className="w-10 h-10 text-white" />
              </div>
            </GradientBorder>
            <h1 className="text-2xl font-bold text-surface-100 mb-3">Your Content Pillars</h1>
            <p className="text-surface-400 mb-8 leading-relaxed">
              Discover what topics you should be known for. Powered by your skills, experience, projects, brand DNA, writing DNA, and career goals.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating || !userId}
              className={cn('btn-primary gap-2 px-8 py-3 text-base', (!userId || generating) && 'opacity-50 cursor-not-allowed')}
            >
              {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> Building pillars...</> : <><Sparkles className="w-5 h-5" /> Generate Content Pillars</>}
            </button>
          </GlassCard>
        </StaggerItem>
      ) : (
        <>
          {/* Pillars Overview */}
          <StaggerItem>
            <GlassCard>
              <GlassCardHeader title="Content Pillars" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.pillars?.map((pillar: any, i: number) => {
                  const score = report.pillarScores?.find((s: any) => s.priority === i + 1);
                  const cluster = report.topicClusters?.find((tc: any) => tc.pillarName === pillar.name);
                  return (
                    <div key={pillar._id} className="glass rounded-xl p-5 border border-white/5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center text-xs font-bold">{pillar.rank}</span>
                            <h3 className="font-semibold text-surface-200">{pillar.name}</h3>
                          </div>
                          <p className="text-xs text-surface-400 mt-1">{pillar.description}</p>
                        </div>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                          pillar.confidence >= 0.6 ? 'bg-accent-500/10 text-accent-400' :
                          pillar.confidence >= 0.3 ? 'bg-amber-500/10 text-amber-400' :
                          'bg-surface-800 text-surface-500'
                        )}>
                          {Math.round(pillar.confidence * 100)}% match
                        </span>
                      </div>

                      {score && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="text-center">
                            <p className={cn('text-sm font-bold', score.authority.overall >= 60 ? 'text-accent-400' : score.authority.overall >= 35 ? 'text-amber-400' : 'text-surface-500')}>
                              {score.authority.overall}
                            </p>
                            <p className="text-[10px] text-surface-500">Authority</p>
                          </div>
                          <div className="text-center">
                            <p className={cn('text-sm font-bold', score.engagement.overall >= 60 ? 'text-accent-400' : score.engagement.overall >= 35 ? 'text-amber-400' : 'text-surface-500')}>
                              {score.engagement.overall}
                            </p>
                            <p className="text-[10px] text-surface-500">Engagement</p>
                          </div>
                          <div className="text-center">
                            <p className={cn('text-sm font-bold', score.careerAlignment.overall >= 60 ? 'text-accent-400' : score.careerAlignment.overall >= 35 ? 'text-amber-400' : 'text-surface-500')}>
                              {score.careerAlignment.overall}
                            </p>
                            <p className="text-[10px] text-surface-500">Career</p>
                          </div>
                        </div>
                      )}

                      {cluster && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {cluster.nodes?.filter((n: any) => n.level === 1).slice(0, 4).map((n: any, j: number) => (
                            <span key={j} className="text-[10px] bg-surface-800 text-surface-400 px-2 py-0.5 rounded">{n.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </StaggerItem>

          {/* Authority Map */}
          {report.authorityMap && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Authority Map" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="glass rounded-xl p-4 border border-emerald-500/20 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{report.authorityMap.summary.strongAreas}</p>
                    <p className="text-xs text-surface-400">Strong</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-brand-500/20 text-center">
                    <p className="text-2xl font-bold text-brand-400">{report.authorityMap.summary.growingAreas}</p>
                    <p className="text-xs text-surface-400">Growing</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-amber-500/20 text-center">
                    <p className="text-2xl font-bold text-amber-400">{report.authorityMap.summary.weakAreas}</p>
                    <p className="text-xs text-surface-400">Weak</p>
                  </div>
                  <div className="glass rounded-xl p-4 border border-purple-500/20 text-center">
                    <p className="text-2xl font-bold text-purple-400">{report.authorityMap.summary.futureAreas}</p>
                    <p className="text-xs text-surface-400">Future</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {report.authorityMap.areas?.slice(0, 10).map((area: any, i: number) => (
                    <div key={i} className="flex items-center justify-between glass rounded-lg px-4 py-3 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full', area.status === 'strong' ? 'bg-emerald-400' : area.status === 'growing' ? 'bg-brand-400' : area.status === 'weak' ? 'bg-amber-400' : 'bg-purple-400')} />
                        <span className="text-sm text-surface-300">{area.topic}</span>
                        <span className="text-[10px] text-surface-500">({area.pillar})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${area.currentScore}%` }} className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
                        </div>
                        <span className="text-xs text-surface-400 w-8">{area.currentScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </StaggerItem>
          )}

          {/* Content Distribution */}
          {report.contentDistribution && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Content Distribution" />
                <p className="text-sm text-surface-400 mb-4">
                  {report.contentDistribution.summary.totalPostsPerWeek} posts per week recommended
                </p>
                <div className="space-y-4">
                  {report.contentDistribution.distributions?.map((d: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-surface-300">{d.pillarName}</span>
                        <span className="text-surface-400">{d.percentage}% ({d.postsPerWeek}/wk)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-surface-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${d.percentage}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                        />
                      </div>
                      <p className="text-[10px] text-surface-500 mt-0.5">{d.reasoning}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </StaggerItem>
          )}

          {/* Opportunity Analysis */}
          {report.opportunityAnalysis && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Growth Opportunities" />
                <div className="space-y-3">
                  {report.opportunityAnalysis.highOpportunityPillars?.slice(0, 4).map((op: any, i: number) => (
                    <div key={i} className="glass rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-surface-200">{op.name}</h4>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', op.score >= 60 ? 'bg-accent-500/10 text-accent-400' : 'bg-amber-500/10 text-amber-400')}>
                          Score: {op.score}
                        </span>
                      </div>
                      <p className="text-xs text-surface-400">{op.reasoning}</p>
                    </div>
                  ))}
                </div>
                {report.opportunityAnalysis.emergingTrends?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-surface-300 mb-3">Emerging Trends</h4>
                    <div className="flex flex-wrap gap-2">
                      {report.opportunityAnalysis.emergingTrends.map((t: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-sm">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </StaggerItem>
          )}

          {/* Evolution */}
          {report.evolution && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Pillar Evolution" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {report.evolution.allPillars?.map((ep: any, i: number) => (
                    <div key={i} className={cn(
                      'glass rounded-xl p-4 border text-center',
                      ep.stage === 'maturing' ? 'border-accent-500/20' :
                      ep.stage === 'active' ? 'border-brand-500/20' :
                      ep.stage === 'emerging' ? 'border-amber-500/20' :
                      'border-purple-500/20'
                    )}>
                      <p className="text-sm font-semibold text-surface-200 mb-1">{ep.name}</p>
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full',
                        ep.stage === 'maturing' ? 'bg-accent-500/10 text-accent-400' :
                        ep.stage === 'active' ? 'bg-brand-500/10 text-brand-400' :
                        ep.stage === 'emerging' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-purple-500/10 text-purple-400'
                      )}>
                        {ep.stage}
                      </span>
                      <p className="text-[10px] text-surface-500 mt-2">Next: {ep.nextEvolution}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </StaggerItem>
          )}

          {/* Topic Clusters */}
          {report.topicClusters?.length > 0 && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Topic Clusters" />
                <div className="space-y-6">
                  {report.topicClusters.map((tc: any, i: number) => (
                    <div key={i} className="glass rounded-xl p-5 border border-white/5">
                      <h3 className="font-semibold text-surface-200 mb-2">{tc.pillarName}</h3>
                      <p className="text-xs text-surface-500 mb-3">{tc.totalTopics} topics · {tc.summary.beginnerCount} beginner · {tc.summary.intermediateCount} intermediate · {tc.summary.advancedCount} advanced</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {tc.nodes?.filter((n: any) => n.level === 1).slice(0, 6).map((node: any, j: number) => (
                          <div key={j} className="bg-surface-800 rounded-lg p-3 border border-white/5">
                            <p className="text-sm text-surface-300">{node.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded',
                                node.difficulty === 'beginner' ? 'bg-accent-500/10 text-accent-400' :
                                node.difficulty === 'intermediate' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-red-500/10 text-red-400'
                              )}>{node.difficulty}</span>
                              <span className="text-[10px] text-surface-500">Relevance: {node.relevanceScore}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </StaggerItem>
          )}
        </>
      )}
    </StaggerContainer>
  );
}
