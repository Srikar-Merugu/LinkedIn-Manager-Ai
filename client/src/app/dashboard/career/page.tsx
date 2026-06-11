'use client';

import { useState, useEffect } from 'react';
import {
  Target,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Users,
  Globe,
  Lightbulb,
  Compass,
  ArrowRight,
  Calendar,
  Star,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import Link from 'next/link';

type SkillGap = { skill: string; currentLevel: string; targetLevel: string; priority: string };
type Recommendation = { title: string; description: string; timeframe: string; priority: string; actions: string[] };
type Milestone = { week: number; title: string; description: string; tasks: string[]; status: string };
type AuthorityMap = { topics: string[]; currentAuthority: number; targetAuthority: number };
type NetworkingPlan = { targetConnections: number; focusAreas: string[]; weeklyActions: string[] };
type CareerBlueprint = {
  currentPosition: string;
  targetPosition: string;
  careerStage: string;
  skillGaps: SkillGap[];
  recommendations: Recommendation[];
  milestones: Milestone[];
  authorityMap: AuthorityMap;
  networkingPlan: NetworkingPlan;
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  medium: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  low: 'bg-surface-800 text-surface-400 border-surface-700',
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-accent-500/10 text-accent-400',
  in_progress: 'bg-brand-500/10 text-brand-400',
  pending: 'bg-surface-800 text-surface-500',
};

export default function CareerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<CareerBlueprint | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const report = await api.report.get();
        const bp = report?.careerBlueprint;
        if (bp && bp.currentPosition) {
          setBlueprint(bp);
        }
      } catch (err: any) {
        if (err.message?.includes('404') || err.message?.includes('No analysis report')) {
          setBlueprint(null);
        } else {
          setError(err.message || 'Failed to load career data');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-2">Something went wrong</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard glow className="text-center p-12 max-w-2xl mx-auto">
          <GradientBorder animate className="inline-flex mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Compass className="w-10 h-10 text-white" />
            </div>
          </GradientBorder>

          <h1 className="text-2xl font-bold text-surface-100 mb-3">Career Intelligence</h1>
          <p className="text-surface-400 mb-8 leading-relaxed">
            Complete onboarding to see your career blueprint with skill gaps, milestones, and a personalized growth plan.
          </p>

          <Link href="/onboarding" className="btn-primary gap-2 px-8 py-3 text-base inline-flex items-center">
            Go to Onboarding
            <ArrowRight className="w-5 h-5" />
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Career Intelligence</h1>
          <p className="text-surface-400 mt-1">Your AI-powered career growth strategy</p>
        </div>
      </StaggerItem>

      {/* Career Position Header */}
      <StaggerItem>
        <GlassCard glow className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.03] to-accent-500/[0.03]" />
          <div className="relative p-8 text-center">
            <GradientBorder animate className="inline-flex mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <Target className="w-8 h-8 text-white" />
              </div>
            </GradientBorder>
            <div className="flex items-center justify-center gap-4 text-sm mt-4 flex-wrap">
              <span className="px-4 py-1.5 rounded-full bg-surface-800 text-surface-300 border border-surface-700">
                {blueprint.currentPosition?.replace(/_/g, ' ') || 'Current Role'}
              </span>
              <ArrowRight className="w-4 h-4 text-accent-400" />
              <span className="px-4 py-1.5 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20">
                {blueprint.targetPosition?.replace(/_/g, ' ') || 'Target Role'}
              </span>
              {blueprint.careerStage && (
                <span className="px-4 py-1.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 capitalize">
                  {blueprint.careerStage.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Skill Gaps */}
      {(blueprint.skillGaps || []).length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Skill Gap Analysis" />
            <div className="space-y-3">
              {(blueprint.skillGaps || []).map((gap, i) => (
                <div key={i} className="glass rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-surface-200">{gap.skill}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[gap.priority] || PRIORITY_COLORS.low}`}>
                      {gap.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-surface-400">
                    <span>Current: <span className="text-surface-300">{gap.currentLevel}</span></span>
                    <span>→</span>
                    <span>Target: <span className="text-accent-400">{gap.targetLevel}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}

      {/* Recommendations */}
      {(blueprint.recommendations || []).length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Recommendations" />
            <div className="space-y-4">
              {(blueprint.recommendations || []).map((rec, i) => (
                <div key={i} className="glass rounded-xl p-5 border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-surface-200">{rec.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-surface-500">{rec.timeframe}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.low}`}>
                        {rec.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-surface-400 mb-3">{rec.description}</p>
                  {(rec.actions || []).length > 0 && (
                    <ul className="space-y-1">
                      {(rec.actions || []).map((action, j) => (
                        <li key={j} className="text-xs text-surface-500 flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 text-accent-400 mt-0.5 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}

      {/* Milestones */}
      {(blueprint.milestones || []).length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Milestones" />
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-500 to-accent-500" />
              <div className="space-y-6">
                {(blueprint.milestones || []).map((ms, i) => (
                  <div key={i} className="relative pl-10">
                    <div
                      className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                        ms.status === 'completed' ? 'bg-accent-500 border-accent-500' :
                        ms.status === 'in_progress' ? 'bg-brand-500 border-brand-500' :
                        'bg-surface-800 border-surface-600'
                      }`}
                      style={{ top: '4px' }}
                    />
                    <div className="glass rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-semibold text-surface-200">
                          Week {ms.week}: {ms.title}
                        </h5>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[ms.status] || STATUS_COLORS.pending}`}>
                          {(ms.status || 'pending').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-surface-400 mb-2">{ms.description}</p>
                      {(ms.tasks || []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(ms.tasks || []).map((task, j) => (
                            <span key={j} className="text-xs bg-surface-800 text-surface-500 px-2 py-0.5 rounded">{task}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </StaggerItem>
      )}

      {/* Authority Map */}
      {blueprint.authorityMap && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Authority Map" />
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass rounded-xl p-4 border border-white/5 text-center">
                <p className="text-2xl font-bold text-accent-400">{blueprint.authorityMap.currentAuthority}%</p>
                <p className="text-xs text-surface-400">Current Authority</p>
              </div>
              <div className="glass rounded-xl p-4 border border-white/5 text-center">
                <p className="text-2xl font-bold text-brand-400">{blueprint.authorityMap.targetAuthority}%</p>
                <p className="text-xs text-surface-400">Target Authority</p>
              </div>
            </div>
            {(blueprint.authorityMap.topics || []).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-300 mb-3">Focus Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {(blueprint.authorityMap.topics || []).map((topic, i) => (
                    <span key={i} className="text-sm bg-surface-800 text-surface-300 px-3 py-1.5 rounded-lg border border-white/5">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </StaggerItem>
      )}

      {/* Networking Plan */}
      {blueprint.networkingPlan && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Networking Plan" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass rounded-xl p-5 border border-white/5 text-center">
                <Users className="w-8 h-8 text-brand-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-surface-100">{blueprint.networkingPlan.targetConnections || 0}</p>
                <p className="text-xs text-surface-400">Target Connections</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-surface-300 mb-3">Focus Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {(blueprint.networkingPlan.focusAreas || []).map((area, i) => (
                    <span key={i} className="text-sm bg-brand-500/10 text-brand-400 px-3 py-1.5 rounded-lg border border-brand-500/20">
                      {area}
                    </span>
                  ))}
                </div>
                {(blueprint.networkingPlan.weeklyActions || []).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-surface-300 mb-2">Weekly Actions</h4>
                    <ul className="space-y-1">
                      {(blueprint.networkingPlan.weeklyActions || []).map((action, i) => (
                        <li key={i} className="text-xs text-surface-400 flex items-start gap-2">
                          <Calendar className="w-3 h-3 text-accent-400 mt-0.5 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}
