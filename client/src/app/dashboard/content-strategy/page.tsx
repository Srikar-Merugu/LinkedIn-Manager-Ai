'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Sparkles,
  BookOpen,
  Target,
  Lightbulb,
  Clock,
  Zap,
  BarChart3,
  Loader2,
  AlertCircle,
  ArrowRight,
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

const phaseIcons: Record<string, typeof TrendingUp> = {
  positioning: TrendingUp,
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

export default function ContentStrategyPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.report.get();
        setReport(res);
      } catch (err: any) {
        if (err.message?.includes('404') || err.message?.includes('No analysis report')) {
          setReport(null);
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const strategy = report?.strategy90Days;

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

  if (!report || !strategy) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Content Strategy
          </h1>
          <p className="text-gray-400 mt-1">Strategic intelligence engine — 90-day content strategy</p>
        </div>

        {error && (
          <GradientBorder className="border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 p-4">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          </GradientBorder>
        )}

        <GlassCard>
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-cyan-400/50" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">No Strategy Yet</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Complete onboarding to see your content strategy. Your 90-day roadmap will be generated from your profile, career goals, and brand identity.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              Go to Onboarding
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  const monthlyPlans = (strategy.monthlyPlans || []).sort((a: any, b: any) => a.month - b.month);
  const weeklyThemes = (strategy.weeklyThemes || []).sort((a: any, b: any) => a.week - b.week);
  const growthGoals = strategy.growthGoals || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Content Strategy
        </h1>
        <p className="text-gray-400 mt-1">Strategic intelligence engine — 90-day content strategy</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {[
          { id: 'overview', label: '90-Day Roadmap', icon: Clock },
          { id: 'months', label: 'Monthly Plans', icon: BookOpen },
          { id: 'themes', label: 'Weekly Themes', icon: Lightbulb },
          { id: 'goals', label: 'Growth Goals', icon: Target },
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
              <GlassCardHeader title="90-Day Strategic Roadmap" description={strategy.recommendedFrequency ? `Recommended posting: ${strategy.recommendedFrequency}` : undefined} />
              <div className="space-y-4 mt-4">
                <p className="text-gray-300 leading-relaxed">
                  {strategy.narrative || 'No strategy narrative available.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {monthlyPlans.map((plan: any, idx: number) => {
                    const PhaseIcon = phaseIcons[plan.phase] || Clock;
                    return (
                      <GradientBorder key={idx} className={cn('border', phaseColors[plan.phase] || '')}>
                        <GlassCard>
                          <div className="flex items-center gap-3 mb-3">
                            <PhaseIcon className="w-5 h-5" />
                            <div>
                              <p className="text-sm font-semibold capitalize">{plan.phase} Phase</p>
                              <p className="text-xs text-gray-500">Month {plan.month}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mb-3">{plan.focus}</p>
                          <ul className="space-y-1.5">
                            {(plan.goals || []).slice(0, 3).map((g: string, i: number) => (
                              <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-cyan-400 shrink-0" />
                                <span>{g}</span>
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
                {monthlyPlans.map((plan: any, idx: number) => (
                  <div key={idx}>
                    <p className="text-sm font-semibold text-gray-300 mb-2 capitalize">
                      Month {plan.month} — {plan.phase}
                    </p>
                    <div className="space-y-2">
                      {(plan.contentMix || []).map((mix: any, i: number) => (
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
          {monthlyPlans.map((plan: any, idx: number) => {
            const PhaseIcon = phaseIcons[plan.phase] || Clock;
            return (
              <StaggerItem key={idx}>
                <GradientBorder className={cn('border', phaseColors[plan.phase] || '')}>
                  <GlassCard>
                    <div className="flex items-center gap-3 mb-4">
                      <PhaseIcon className="w-6 h-6" />
                      <div>
                        <h3 className="text-lg font-semibold capitalize">{plan.phase} Phase</h3>
                        <p className="text-sm text-gray-500">Month {plan.month}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-4">{plan.focus}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-semibold text-gray-300 mb-2">Goals</p>
                        <div className="space-y-2">
                          {(plan.goals || []).map((g: string, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-white/5">
                              <p className="text-sm text-gray-200">{g}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-300 mb-2">Content Mix</p>
                        <div className="space-y-2">
                          {(plan.contentMix || []).map((mix: any, i: number) => (
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
              {weeklyThemes.map((theme: any, idx: number) => (
                <GradientBorder key={idx} className={cn('border', phaseColors[theme.week <= 4 ? 'positioning' : theme.week <= 8 ? 'authority' : 'opportunity'])}>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/5 text-gray-400">
                        Week {theme.week}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm">{theme.theme}</h4>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(theme.contentTypes || []).map((ct: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">{ct}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(theme.topics || []).map((topic: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 truncate max-w-[140px]">{topic}</span>
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
            <GlassCardHeader title="Growth Goals" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {growthGoals.map((goal: any, idx: number) => (
                <StaggerItem key={idx}>
                  <GlassCard className="h-full">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', categoryColors[goal.category] || 'bg-gray-500/20 text-gray-400')}>
                        {goal.category}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm text-gray-200">{goal.goal}</h4>
                    <div className="flex items-center gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Metric</p>
                        <p className="text-sm text-gray-300">{goal.metric}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Target</p>
                        <p className="text-sm text-cyan-400 font-medium">{goal.target}</p>
                      </div>
                    </div>
                  </GlassCard>
                </StaggerItem>
              ))}
            </div>
          </GlassCard>
        </StaggerContainer>
      )}
    </div>
  );
}
