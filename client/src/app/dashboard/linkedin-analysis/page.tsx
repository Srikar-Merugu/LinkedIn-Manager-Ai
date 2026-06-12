'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, RefreshCw, Calendar, FileText, Share2,
  AlertCircle, ChevronDown, ChevronRight, Sparkles, Loader2,
  CheckCircle2, XCircle, AlertTriangle, PenSquare,
  Download, TrendingUp,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AnalysisReport {
  _id?: string;
  userId?: string;
  linkedinAnalysis?: any;
  resumeAnalysis?: any;
  githubAnalysis?: any;
  scores?: {
    technicalLeadership?: number;
    contentReadiness?: number;
    industryAuthority?: number;
    personalBrand?: number;
    careerOpportunity?: number;
  };
  strengths?: { title: string; category: string; description: string; impact: string; score: number; evidence: string[] }[];
  weaknesses?: { title: string; category: string; description: string; impact: string; score: number; evidence: string[] }[];
  brandDNA?: any;
  writingDNA?: any;
  profileScore?: number;
  profileHealth?: { section: string; status: 'strong' | 'good' | 'needs_improvement' | 'missing'; details: string }[];
  missingSections?: { section: string; priority: 'high' | 'medium' | 'low'; reason: string }[];
  improvements?: { title: string; priority: 'high' | 'medium' | 'low'; impact: string; effort: string; description: string }[];
  contentOpportunities?: { topic: string; reason: string; engagementScore: number; pillar: string }[];
  aiSummary?: string;
  generatedAt?: string;
}

const STATUS_CONFIG = {
  strong: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Strong' },
  good: { icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Good' },
  needs_improvement: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Needs Work' },
  missing: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Missing' },
};

const PRIORITY_CONFIG = {
  high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  low: { color: 'text-surface-400', bg: 'bg-surface-500/10', border: 'border-surface-500/20' },
};

export default function LinkedInAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    health: true,
    strengths: true,
    missing: true,
    improvements: true,
    opportunities: true,
    summary: true,
  });
  const [exporting, setExporting] = useState(false);
  const [shareTooltip, setShareTooltip] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.report.get();
      if (!data || (data && typeof data === 'object' && 'message' in data && !data._id)) {
        setReport(null);
      } else {
        setReport(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleExportJSON = () => {
    if (!report) return;
    setExporting(true);
    try {
      const data = {
        profileScore: report.profileScore,
        profileHealth: report.profileHealth,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        missingSections: report.missingSections,
        improvements: report.improvements,
        contentOpportunities: report.contentOpportunities,
        aiSummary: report.aiSummary,
        generatedAt: report.generatedAt,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedin-analysis-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleExportText = () => {
    if (!report) return;
    setExporting(true);
    try {
      const lines: string[] = [];
      lines.push('LINKEDIN ANALYSIS REPORT');
      lines.push(`Generated: ${report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : 'N/A'}`);
      lines.push('');
      lines.push(`PROFILE SCORE: ${report.profileScore || 0}/100`);
      lines.push('');
      lines.push('--- PROFILE HEALTH ---');
      report.profileHealth?.forEach(h => {
        lines.push(`[${h.status.toUpperCase()}] ${h.section}: ${h.details}`);
      });
      lines.push('');
      lines.push('--- STRENGTHS ---');
      report.strengths?.forEach(s => {
        lines.push(`• ${s.title} (${s.impact}) — ${s.description}`);
      });
      lines.push('');
      lines.push('--- MISSING SECTIONS ---');
      report.missingSections?.forEach(m => {
        lines.push(`[${m.priority.toUpperCase()}] ${m.section}: ${m.reason}`);
      });
      lines.push('');
      lines.push('--- IMPROVEMENTS ---');
      report.improvements?.forEach(i => {
        lines.push(`[${i.priority.toUpperCase()}] ${i.title} — ${i.impact} (${i.effort})`);
      });
      lines.push('');
      lines.push('--- CONTENT OPPORTUNITIES ---');
      report.contentOpportunities?.forEach(c => {
        lines.push(`• ${c.topic} (Score: ${c.engagementScore}) — ${c.reason}`);
      });
      lines.push('');
      lines.push('--- AI SUMMARY ---');
      lines.push(report.aiSummary || 'No summary available');

      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedin-analysis-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      profileScore: report?.profileScore || 0,
      strengths: report?.strengths?.length || 0,
      missing: report?.missingSections?.length || 0,
    };
    const text = `My LinkedIn Profile Score: ${shareData.profileScore}/100 | ${shareData.strengths} strengths identified | ${shareData.missing} areas to improve`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'LinkedIn Analysis', text, url: window.location.href });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShareTooltip(true);
        setTimeout(() => setShareTooltip(false), 2000);
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">Analyzing your LinkedIn profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-surface-100 mb-3">Failed to Load Analysis</h2>
          <p className="text-surface-400 mb-8 leading-relaxed">{error}</p>
          <button onClick={loadReport} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="w-5 h-5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-10 h-10 text-brand-400" />
          </div>
          <h2 className="text-xl font-semibold text-surface-100 mb-3">No Analysis Found</h2>
          <p className="text-surface-400 mb-8 leading-relaxed">Complete onboarding to see your LinkedIn analysis</p>
          <a href="/onboarding" className="btn-primary inline-flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Go to Onboarding
          </a>
        </div>
      </div>
    );
  }

  const profileScore = report.profileScore || 0;
  const scoreLabel = profileScore >= 80 ? 'Excellent' : profileScore >= 60 ? 'Good' : profileScore >= 40 ? 'Needs Improvement' : 'Getting Started';
  const scoreColor = profileScore >= 80 ? 'text-green-400' : profileScore >= 60 ? 'text-blue-400' : profileScore >= 40 ? 'text-amber-400' : 'text-red-400';

  const healthCount = { strong: 0, good: 0, needs_improvement: 0, missing: 0 };
  report.profileHealth?.forEach(h => { healthCount[h.status as keyof typeof healthCount]++; });

  return (
    <StaggerContainer className="space-y-6">
      {/* Header */}
      <StaggerItem>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-brand-500/10">
                <BarChart3 className="w-5 h-5 text-brand-400" />
              </div>
              <h1 className="text-2xl font-bold text-surface-100">LinkedIn Analysis</h1>
            </div>
            <p className="text-surface-400 ml-12">Complete profile analysis and improvement roadmap</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <Calendar className="w-3.5 h-3.5" />
              {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </div>
            <div className="relative">
              <button onClick={handleExportJSON} disabled={exporting} className="btn-secondary gap-2 text-sm">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
            <div className="relative">
              <button onClick={handleShare} className="btn-ghost gap-2 text-sm">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <AnimatePresence>
                {shareTooltip && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute right-0 top-full mt-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 whitespace-nowrap z-10">
                    Copied to clipboard!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </StaggerItem>

      {/* Section 1: Profile Score */}
      <StaggerItem>
        <GlassCard glow className="p-8">
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0">
              <ScoreGauge score={profileScore} label="Profile Score" size="lg" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className={`text-3xl font-bold ${scoreColor}`}>{profileScore}/100</h2>
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium', scoreColor.replace('text-', 'bg-').replace('400', '500/10'), scoreColor)}>
                  {scoreLabel}
                </span>
              </div>
              <p className="text-surface-400 text-sm leading-relaxed max-w-xl">
                {profileScore >= 80
                  ? 'Your profile is strong. Focus on consistent content creation to maintain momentum.'
                  : profileScore >= 60
                  ? 'Your profile is solid. Address the missing sections below to reach excellence.'
                  : profileScore >= 40
                  ? 'Your profile has a good foundation. Complete the key sections to improve visibility.'
                  : 'Start by completing the essential profile sections to build your presence.'}
              </p>
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-surface-400">{healthCount.strong} Strong</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs text-surface-400">{healthCount.good} Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-surface-400">{healthCount.needs_improvement} Needs Work</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-surface-400">{healthCount.missing} Missing</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Section 2: Profile Health */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader
            title="Profile Health"
            description="Status of each profile section"
            action={
              <button onClick={() => toggleSection('health')} className="btn-ghost p-1">
                {expandedSections.health ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            }
          />
          <AnimatePresence>
            {expandedSections.health && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {report.profileHealth?.map((item, i) => {
                    const config = STATUS_CONFIG[item.status];
                    const Icon = config.icon;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={cn('p-3 rounded-xl border', config.bg, config.border)}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className={cn('w-4 h-4', config.color)} />
                          <span className="text-xs font-semibold text-surface-200">{item.section}</span>
                        </div>
                        <p className={cn('text-[10px] font-medium uppercase', config.color)}>{config.label}</p>
                        <p className="text-[10px] text-surface-500 mt-1 truncate">{item.details}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* Section 3: Profile Strengths */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader
            title="Profile Strengths"
            description="What your profile does well"
            action={
              <button onClick={() => toggleSection('strengths')} className="btn-ghost p-1">
                {expandedSections.strengths ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            }
          />
          <AnimatePresence>
            {expandedSections.strengths && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.strengths?.slice(0, 6).map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-200">{item.title}</p>
                        <p className="text-xs text-surface-500 mt-0.5">{item.description}</p>
                        {item.evidence?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.evidence.slice(0, 3).map((e, j) => (
                              <span key={j} className="px-1.5 py-0.5 rounded text-[9px] bg-green-500/10 text-green-400">{e}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* Section 4: Missing Sections */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader
            title="Missing Sections"
            description="Critical gaps in your profile"
            action={
              <button onClick={() => toggleSection('missing')} className="btn-ghost p-1">
                {expandedSections.missing ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            }
          />
          <AnimatePresence>
            {expandedSections.missing && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                {(!report.missingSections || report.missingSections.length === 0) ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                    <p className="text-sm text-surface-300">Your profile is complete! No critical gaps found.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {report.missingSections.map((item, i) => {
                      const pConfig = PRIORITY_CONFIG[item.priority];
                      return (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase', pConfig.bg, pConfig.color, pConfig.border)}>
                            {item.priority}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-200">{item.section}</p>
                            <p className="text-xs text-surface-500">{item.reason}</p>
                          </div>
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* Section 5: Improvement Suggestions */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader
            title="Improvement Suggestions"
            description="Prioritized actions to boost your profile"
            action={
              <button onClick={() => toggleSection('improvements')} className="btn-ghost p-1">
                {expandedSections.improvements ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            }
          />
          <AnimatePresence>
            {expandedSections.improvements && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.improvements?.map((item, i) => {
                    const pConfig = PRIORITY_CONFIG[item.priority];
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase', pConfig.bg, pConfig.color, pConfig.border)}>
                            {item.priority}
                          </span>
                          <span className="text-[10px] text-surface-500">{item.effort}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-surface-200 mb-1">{item.title}</h4>
                        <p className="text-xs text-surface-500 mb-2">{item.description}</p>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3 text-green-400" />
                          <span className="text-[10px] text-green-400">{item.impact}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* Section 6: Content Opportunities */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader
            title="Content Opportunities"
            description="AI-generated post ideas based on your profile"
            action={
              <button onClick={() => toggleSection('opportunities')} className="btn-ghost p-1">
                {expandedSections.opportunities ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            }
          />
          <AnimatePresence>
            {expandedSections.opportunities && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="space-y-2">
                  {report.contentOpportunities?.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-brand-400">{item.engagementScore}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-200">{item.topic}</p>
                        <p className="text-xs text-surface-500">{item.reason}</p>
                        <span className="text-[10px] text-surface-600 uppercase">{item.pillar}</span>
                      </div>
                      <Link href={`/dashboard/content-studio?topic=${encodeURIComponent(item.topic)}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-500/20 transition-colors flex-shrink-0">
                        <PenSquare className="w-3 h-3" /> Generate
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* Section 7: AI Summary */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader
            title="AI Summary"
            description="AI-generated overview of your profile"
            action={
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-surface-500">
                  <Sparkles className="w-3.5 h-3.5" /> AI Generated
                </div>
                <button onClick={() => toggleSection('summary')} className="btn-ghost p-1">
                  {expandedSections.summary ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            }
          />
          <AnimatePresence>
            {expandedSections.summary && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <p className="text-surface-300 leading-relaxed text-sm">
                  {report.aiSummary || 'Complete your analysis to see an AI-generated summary of your profile.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* Export Options */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Export Report" description="Download your analysis in different formats" />
          <div className="flex items-center gap-3">
            <button onClick={handleExportJSON} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-surface-300 hover:text-surface-100 hover:bg-white/[0.05] transition-all">
              <FileText className="w-4 h-4" /> Export JSON
            </button>
            <button onClick={handleExportText} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-surface-300 hover:text-surface-100 hover:bg-white/[0.05] transition-all">
              <Download className="w-4 h-4" /> Export Text
            </button>
            <button onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-surface-300 hover:text-surface-100 hover:bg-white/[0.05] transition-all">
              <Share2 className="w-4 h-4" /> Share Summary
            </button>
          </div>
        </GlassCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
