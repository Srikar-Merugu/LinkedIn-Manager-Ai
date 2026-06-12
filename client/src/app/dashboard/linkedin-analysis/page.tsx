'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Download, Share2, CheckCircle2, AlertTriangle, XCircle,
  Target, Briefcase, FileText, Lightbulb, TrendingUp, Star, ArrowRight,
  Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

interface AnalysisReport {
  _id?: string;
  userId?: string;
  linkedinAnalysis?: {
    username?: string;
    headline?: string;
    about?: string;
    experience?: any[];
    skills?: string[];
    industry?: string;
    location?: string;
  };
  resumeAnalysis?: {
    skills?: string[];
    experience?: any[];
    projects?: any[];
    certifications?: any[];
    totalExperienceYears?: number;
    currentRole?: string;
  };
  githubAnalysis?: {
    username?: string;
    connected?: boolean;
    languages?: string[];
    repos?: number;
  };
  scores?: {
    technicalLeadership?: number;
    contentReadiness?: number;
    industryAuthority?: number;
    personalBrand?: number;
    careerOpportunity?: number;
  };
  strengths?: { title: string; category: string; description: string; impact: string; score: number; evidence: string[] }[];
  weaknesses?: { title: string; category: string; description: string; impact: string; score: number; evidence: string[] }[];
  brandDNA?: {
    archetype?: string;
    archetypeDescription?: string;
    positioning?: string;
    uniqueValueProposition?: string;
    missionStatement?: string;
    targetAudience?: string;
    brandTerritory?: string[];
    values?: string[];
    originStory?: string;
  };
  writingDNA?: {
    voiceSignature?: string;
    communicationStyle?: string;
    toneProfile?: { primary: string; secondary: string[] };
    vocabularyProfile?: { favoriteWords: string[]; technicalTerms: string[]; avgWordLength: number };
    structureProfile?: { avgSentenceLength: number; usesBulletPoints: boolean; usesQuestions: boolean; usesStories: boolean };
    hooks?: { type: string; text: string; effectiveness: number }[];
    ctas?: { type: string; text: string; effectiveness: number }[];
    formatPreferences?: string[];
    emotionalProfile?: { curiosity: number; authority: number; empathy: number };
  };
  careerBlueprint?: {
    currentPosition?: string;
    targetPosition?: string;
    careerStage?: string;
    skillGaps?: { skill: string; currentLevel: string; targetLevel: string; priority: string }[];
    recommendations?: { title: string; description: string; timeframe: string; priority: string; actions: string[] }[];
    milestones?: { week: number; title: string; description: string; tasks: string[]; status: string }[];
  };
  profileScore?: number;
  profileHealth?: { section: string; status: 'strong' | 'good' | 'needs_improvement' | 'missing'; details: string }[];
  missingSections?: { section: string; priority: 'high' | 'medium' | 'low'; reason: string }[];
  improvements?: { title: string; priority: 'high' | 'medium' | 'low'; impact: string; effort: string; description: string }[];
  contentOpportunities?: { topic: string; reason: string; engagementScore: number; pillar: string }[];
  quickWins?: { action: string; impact: string; effort: string; category: string }[];
  aiSummary?: string;
  generatedAt?: string;
}

const STATUS_CONFIG = {
  strong: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Strong' },
  good: { icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Good' },
  needs_improvement: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Needs Work' },
  missing: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Missing' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  low: { color: 'text-surface-400', bg: 'bg-surface-500/10', border: 'border-surface-500/20' },
};

function AnimatedGauge({ score }: { score: number }) {
  const percentage = Math.min(Math.max(score, 0), 100);
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke;
  const circumference = 2 * Math.PI * normalizedRadius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 80) return '#4ade80';
    if (percentage >= 60) return '#60a5fa';
    if (percentage >= 40) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
      <svg width={radius * 2} height={radius * 2} className="transform -rotate-90">
        <circle
          cx={radius} cy={radius} r={normalizedRadius}
          stroke="currentColor" strokeWidth={stroke} fill="none"
          className="text-surface-800"
        />
        <motion.circle
          cx={radius} cy={radius} r={normalizedRadius}
          stroke={getColor()} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-5xl font-bold tabular-nums"
          style={{ color: getColor() }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {score}
        </motion.span>
        <span className="text-surface-500 text-sm mt-1">/ 100</span>
      </div>
    </div>
  );
}

export default function LinkedInAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    profileScore: true,
    profileHealth: true,
    strengths: true,
    weaknesses: true,
    skillGaps: true,
    recommendations: true,
    brandDNA: true,
    voiceProfile: true,
    contentOpps: true,
    actionPlan: true,
  });
  const [exporting, setExporting] = useState(false);
  const [shareTooltip, setShareTooltip] = useState(false);
  const [showRawModal, setShowRawModal] = useState(false);

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

  const toggle = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    } catch {}
  };

  const handleExportPDF = () => {
    if (!report) return;
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const m = 20;
      const cw = pw - m * 2;
      let y = m;

      const checkPage = (n: number) => {
        if (y + n > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = m;
        }
      };

      doc.setFillColor(15, 15, 25);
      doc.rect(0, 0, pw, doc.internal.pageSize.getHeight(), 'F');

      doc.setTextColor(200, 200, 220);
      doc.setFontSize(12);
      doc.text('LinkedIn AI Manager', m, 40);

      doc.setFontSize(32);
      doc.setTextColor(255, 255, 255);
      doc.text('LinkedIn Analysis Report', m, 70);

      doc.setFontSize(14);
      doc.setTextColor(150, 150, 180);
      doc.text('Professional Profile Intelligence', m, 82);

      const ps = report.profileScore || 0;
      doc.setFontSize(48);
      doc.setTextColor(100, 130, 255);
      doc.text(`${ps}/100`, m, 130);

      doc.setFontSize(16);
      doc.setTextColor(200, 200, 220);
      const lbl = ps >= 80 ? 'Excellent' : ps >= 60 ? 'Good' : ps >= 40 ? 'Needs Improvement' : 'Getting Started';
      doc.text(lbl, m, 145);

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 150);
      const dt = report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
      doc.text(`Generated: ${dt}`, m, 170);
      doc.text('Generated by LinkedIn AI Manager', m, 178);

      doc.addPage();
      y = m;
      doc.setFillColor(15, 15, 25);
      doc.rect(0, 0, pw, doc.internal.pageSize.getHeight(), 'F');

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('Executive Summary', m, y + 5);
      y += 20;

      doc.setFontSize(10);
      doc.setTextColor(180, 180, 200);
      const lines = doc.splitTextToSize(report.aiSummary || 'No summary available.', cw);
      doc.text(lines, m, y);
      y += lines.length * 5 + 10;

      if (report.profileHealth?.length) {
        checkPage(30);
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('Profile Completeness', m, y);
        y += 12;
        report.profileHealth.forEach((item) => {
          checkPage(10);
          const sc = item.status === 'strong' ? [80, 200, 120] : item.status === 'good' ? [100, 150, 255] : item.status === 'needs_improvement' ? [255, 180, 50] : [255, 80, 80];
          doc.setFontSize(9);
          doc.setTextColor(...sc as [number, number, number]);
          doc.text(`[${item.status.toUpperCase()}]`, m, y);
          doc.setTextColor(200, 200, 220);
          doc.text(`${item.section}: ${item.details}`, m + 35, y);
          y += 6;
        });
        y += 5;
      }

      if (report.strengths?.length) {
        checkPage(30);
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('Top Strengths', m, y);
        y += 12;
        report.strengths.forEach((item) => {
          checkPage(12);
          doc.setFontSize(9);
          doc.setTextColor(80, 200, 120);
          doc.text('+', m, y);
          doc.setTextColor(255, 255, 255);
          doc.text(item.title, m + 6, y);
          y += 5;
          doc.setTextColor(150, 150, 180);
          const dl = doc.splitTextToSize(item.description, cw - 10);
          doc.text(dl, m + 6, y);
          y += dl.length * 4 + 4;
        });
        y += 3;
      }

      if (report.weaknesses?.length) {
        checkPage(30);
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('Areas for Improvement', m, y);
        y += 12;
        report.weaknesses.forEach((item) => {
          checkPage(12);
          doc.setFontSize(9);
          doc.setTextColor(255, 160, 80);
          doc.text('-', m, y);
          doc.setTextColor(255, 255, 255);
          doc.text(item.title, m + 6, y);
          y += 5;
          doc.setTextColor(150, 150, 180);
          const dl = doc.splitTextToSize(item.description, cw - 10);
          doc.text(dl, m + 6, y);
          y += dl.length * 4 + 4;
        });
        y += 3;
      }

      if (report.careerBlueprint?.skillGaps?.length) {
        checkPage(30);
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('Skill Gaps', m, y);
        y += 12;
        report.careerBlueprint.skillGaps.forEach((item) => {
          checkPage(12);
          const pc = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;
          const pcArr = item.priority === 'high' ? [255, 100, 100] : item.priority === 'medium' ? [255, 180, 50] : [150, 150, 180];
          doc.setFontSize(8);
          doc.setTextColor(...pcArr as [number, number, number]);
          doc.text(`[${item.priority.toUpperCase()}]`, m, y);
          doc.setTextColor(255, 255, 255);
          doc.text(item.skill, m + 25, y);
          y += 5;
          doc.setTextColor(150, 150, 180);
          doc.text(`${item.currentLevel} → ${item.targetLevel}`, m + 6, y);
          y += 6;
        });
        y += 3;
      }

      if (report.careerBlueprint?.recommendations?.length) {
        checkPage(30);
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('Career Recommendations', m, y);
        y += 12;
        report.careerBlueprint.recommendations.forEach((item) => {
          checkPage(16);
          const pcArr = item.priority === 'high' ? [255, 100, 100] : item.priority === 'medium' ? [255, 180, 50] : [150, 150, 180];
          doc.setFontSize(8);
          doc.setTextColor(...pcArr as [number, number, number]);
          doc.text(`[${item.priority.toUpperCase()}]`, m, y);
          doc.setTextColor(255, 255, 255);
          doc.text(item.title, m + 25, y);
          doc.setTextColor(150, 150, 180);
          doc.text(`(${item.timeframe})`, m + 25 + doc.getTextWidth(item.title) + 4, y);
          y += 5;
          doc.setTextColor(180, 180, 200);
          const dl = doc.splitTextToSize(item.description, cw - 10);
          doc.text(dl, m + 6, y);
          y += dl.length * 4 + 6;
        });
        y += 3;
      }

      if (report.contentOpportunities?.length) {
        checkPage(30);
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('Content Opportunities', m, y);
        y += 12;
        report.contentOpportunities.forEach((item) => {
          checkPage(14);
          doc.setFontSize(10);
          doc.setTextColor(100, 130, 255);
          doc.text(`${item.engagementScore}`, m, y);
          doc.setTextColor(255, 255, 255);
          doc.text(item.topic, m + 12, y);
          y += 5;
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 180);
          const rl = doc.splitTextToSize(item.reason, cw - 10);
          doc.text(rl, m + 6, y);
          y += rl.length * 4 + 2;
          doc.setTextColor(120, 120, 150);
          doc.text(`Pillar: ${item.pillar}`, m + 6, y);
          y += 6;
        });
      }

      checkPage(20);
      y = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 100);
      doc.text('Generated by LinkedIn AI Manager', m, y);

      doc.save(`LinkedIn_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setExporting(false);
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
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-surface-100 mb-3">Failed to Load Analysis</h2>
          <p className="text-surface-400 mb-8 leading-relaxed">{error}</p>
          <button onClick={loadReport} className="btn-primary inline-flex items-center gap-2">
            <Loader2 className="w-5 h-5" /> Retry
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
            <Target className="w-10 h-10 text-brand-400" />
          </div>
          <h2 className="text-xl font-semibold text-surface-100 mb-3">No Analysis Found</h2>
          <p className="text-surface-400 mb-8 leading-relaxed">Complete onboarding to see your LinkedIn analysis</p>
          <a href="/onboarding" className="btn-primary inline-flex items-center gap-2">
            <ArrowRight className="w-5 h-5" /> Go to Onboarding
          </a>
        </div>
      </div>
    );
  }

  const ps = report.profileScore || 0;
  const scoreLabel = ps >= 80 ? 'Excellent' : ps >= 60 ? 'Good' : ps >= 40 ? 'Needs Improvement' : 'Getting Started';
  const scoreColor = ps >= 80 ? 'text-green-400' : ps >= 60 ? 'text-blue-400' : ps >= 40 ? 'text-amber-400' : 'text-red-400';
  const healthCount = { strong: 0, good: 0, needs_improvement: 0, missing: 0 };
  report.profileHealth?.forEach(h => { healthCount[h.status as keyof typeof healthCount]++; });

  return (
    <>
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100 mb-1">LinkedIn Analysis</h1>
            <p className="text-surface-400">Complete profile intelligence and improvement roadmap</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRawModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-surface-300 hover:text-surface-100 hover:bg-white/[0.05] transition-all font-medium">
              <FileText className="w-4 h-4" /> View Raw Data
            </button>
            <div className="relative">
              <button onClick={handleExportPDF} disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-sm text-brand-400 hover:bg-brand-500/20 transition-all font-medium disabled:opacity-50">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export PDF
              </button>
            </div>
            <div className="relative">
              <button onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-surface-300 hover:text-surface-100 hover:bg-white/[0.05] transition-all relative">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <AnimatePresence>
                {shareTooltip && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute right-0 top-full mt-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 whitespace-nowrap z-10">
                    URL copied to clipboard!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <GlassCard glow className="p-8">
          <button onClick={() => toggle('profileScore')} className="w-full flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-surface-100">Profile Score</h2>
            <motion.div animate={{ rotate: expanded.profileScore ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-surface-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded.profileScore && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="flex items-center gap-10">
                  <div className="flex-shrink-0">
                    <AnimatedGauge score={ps} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={cn('text-3xl font-bold', scoreColor)}>{ps}/100</span>
                      <span className={cn('px-3 py-1 rounded-full text-sm font-medium',
                        ps >= 80 ? 'bg-green-500/10 text-green-400' : ps >= 60 ? 'bg-blue-500/10 text-blue-400' :
                        ps >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                      )}>{scoreLabel}</span>
                    </div>
                    <p className="text-surface-400 text-sm leading-relaxed max-w-xl mb-5">
                      {ps >= 80 ? 'Your profile is strong. Focus on consistent content creation to maintain momentum.'
                        : ps >= 60 ? 'Your profile is solid. Address the gaps below to reach excellence.'
                        : ps >= 40 ? 'Your profile has a good foundation. Complete key sections to improve visibility.'
                        : 'Start by completing the essential profile sections to build your presence.'}
                    </p>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <span className="text-xs text-surface-400">{healthCount.strong} Strong</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-xs text-surface-400">{healthCount.good} Good</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-xs text-surface-400">{healthCount.needs_improvement} Needs Work</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="text-xs text-surface-400">{healthCount.missing} Missing</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <button onClick={() => toggle('profileHealth')} className="w-full flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">Profile Completeness</h3>
              <p className="text-sm text-surface-400 mt-1">Status of each profile section</p>
            </div>
            <motion.div animate={{ rotate: expanded.profileHealth ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-surface-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded.profileHealth && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {report.profileHealth?.map((item, i) => {
                    const config = STATUS_CONFIG[item.status];
                    const Icon = config.icon;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn('p-4 rounded-xl border', config.bg, config.border)}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={cn('w-4 h-4', config.color)} />
                          <span className="text-sm font-semibold text-surface-200">{item.section}</span>
                        </div>
                        <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', config.color)}>{config.label}</p>
                        <p className="text-xs text-surface-500 truncate">{item.details}</p>
                      </motion.div>
                    );
                  })}
                  {(!report.profileHealth || report.profileHealth.length === 0) && (
                    <div className="col-span-full text-center py-8 text-surface-500">No profile health data available</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <button onClick={() => toggle('strengths')} className="w-full flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">Top Strengths</h3>
              <p className="text-sm text-surface-400 mt-1">What your profile does well</p>
            </div>
            <motion.div animate={{ rotate: expanded.strengths ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-surface-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded.strengths && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.strengths?.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                      <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-surface-200">{item.title}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">{item.category}</span>
                        </div>
                        <p className="text-xs text-surface-400 mb-2">{item.description}</p>
                        {item.evidence?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.evidence.slice(0, 3).map((e, j) => (
                              <span key={j} className="px-1.5 py-0.5 rounded text-[9px] bg-green-500/10 text-green-400">{e}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {(!report.strengths || report.strengths.length === 0) && (
                    <div className="col-span-full text-center py-8 text-surface-500">No strengths identified yet</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <button onClick={() => toggle('weaknesses')} className="w-full flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">Areas for Improvement</h3>
              <p className="text-sm text-surface-400 mt-1">Key areas to focus on</p>
            </div>
            <motion.div animate={{ rotate: expanded.weaknesses ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-surface-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded.weaknesses && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.weaknesses?.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-surface-200">{item.title}</p>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium',
                            (item.impact === 'high' ? 'bg-red-500/10 text-red-400' : item.impact === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-surface-500/10 text-surface-400')
                          )}>{item.impact} impact</span>
                        </div>
                        <p className="text-xs text-surface-400 mb-2">{item.description}</p>
                        {item.evidence?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.evidence.slice(0, 3).map((e, j) => (
                              <span key={j} className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400">{e}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {(!report.weaknesses || report.weaknesses.length === 0) && (
                    <div className="col-span-full text-center py-8 text-surface-500">No areas for improvement identified</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <button onClick={() => toggle('skillGaps')} className="w-full flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">Skill Gaps</h3>
              <p className="text-sm text-surface-400 mt-1">Skills to develop for career growth</p>
            </div>
            <motion.div animate={{ rotate: expanded.skillGaps ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-surface-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded.skillGaps && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="space-y-3">
                  {report.careerBlueprint?.skillGaps?.map((item, i) => {
                    const pConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Target className="w-4 h-4 text-brand-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-surface-200">{item.skill}</p>
                              <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase', pConfig.bg, pConfig.color, pConfig.border)}>
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs text-surface-500 mt-0.5">
                              <span className="text-red-400">{item.currentLevel}</span>
                              <span className="text-surface-600 mx-1.5">→</span>
                              <span className="text-green-400">{item.targetLevel}</span>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {(!report.careerBlueprint?.skillGaps || report.careerBlueprint.skillGaps.length === 0) && (
                    <div className="text-center py-8 text-surface-500">No skill gaps identified</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <button onClick={() => toggle('recommendations')} className="w-full flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">Career Recommendations</h3>
              <p className="text-sm text-surface-400 mt-1">Strategic steps for your career path</p>
            </div>
            <motion.div animate={{ rotate: expanded.recommendations ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-surface-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded.recommendations && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="space-y-3">
                  {report.careerBlueprint?.recommendations?.map((item, i) => {
                    const pConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="w-4 h-4 text-brand-400" />
                          <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase', pConfig.bg, pConfig.color, pConfig.border)}>
                            {item.priority}
                          </span>
                          <span className="text-[10px] text-surface-500">{item.timeframe}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-surface-200 mb-1">{item.title}</h4>
                        <p className="text-xs text-surface-500 mb-2">{item.description}</p>
                        {item.actions?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.actions.map((a, j) => (
                              <span key={j} className="px-2 py-0.5 rounded text-[10px] bg-brand-500/10 text-brand-400">{a}</span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  {(!report.careerBlueprint?.recommendations || report.careerBlueprint.recommendations.length === 0) && (
                    <div className="text-center py-8 text-surface-500">No recommendations available</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <button onClick={() => toggle('brandDNA')} className="w-full flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">Personal Brand Summary</h3>
              <p className="text-sm text-surface-400 mt-1">Your brand DNA and positioning</p>
            </div>
            <motion.div animate={{ rotate: expanded.brandDNA ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-surface-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded.brandDNA && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="space-y-4">
                  {report.brandDNA?.archetype && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-brand-500/10 to-accent-500/10 border border-brand-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-brand-400" />
                        <span className="text-xs font-bold uppercase text-brand-400">Brand Archetype</span>
                      </div>
                      <p className="text-lg font-semibold text-surface-100">{report.brandDNA.archetype}</p>
                      {report.brandDNA.archetypeDescription && (
                        <p className="text-xs text-surface-400 mt-1">{report.brandDNA.archetypeDescription}</p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.brandDNA?.positioning && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] font-bold uppercase text-brand-400 mb-1">Positioning</p>
                        <p className="text-sm text-surface-200">{report.brandDNA.positioning}</p>
                      </div>
                    )}
                    {report.brandDNA?.uniqueValueProposition && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] font-bold uppercase text-brand-400 mb-1">Unique Value Proposition</p>
                        <p className="text-sm text-surface-200">{report.brandDNA.uniqueValueProposition}</p>
                      </div>
                    )}
                    {report.brandDNA?.targetAudience && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] font-bold uppercase text-brand-400 mb-1">Target Audience</p>
                        <p className="text-sm text-surface-200">{report.brandDNA.targetAudience}</p>
                      </div>
                    )}
                    {report.brandDNA?.missionStatement && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] font-bold uppercase text-brand-400 mb-1">Mission Statement</p>
                        <p className="text-sm text-surface-200">{report.brandDNA.missionStatement}</p>
                      </div>
                    )}
                  </div>
                  {report.brandDNA?.brandTerritory && report.brandDNA.brandTerritory.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase text-surface-500 mb-2">Brand Territory</p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.brandDNA.brandTerritory.map((t, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-brand-500/10 text-brand-400 border border-brand-500/10">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.brandDNA?.values && report.brandDNA.values.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase text-surface-500 mb-2">Core Values</p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.brandDNA.values.map((v, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-green-500/10 text-green-400 border border-green-500/10">{v}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.brandDNA?.originStory && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] font-bold uppercase text-brand-400 mb-1">Origin Story</p>
                      <p className="text-sm text-surface-300 leading-relaxed">{report.brandDNA.originStory}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <button onClick={() => toggle('voiceProfile')} className="w-full flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">Voice Profile</h3>
              <p className="text-sm text-surface-400 mt-1">Your writing DNA and communication style</p>
            </div>
            <motion.div animate={{ rotate: expanded.voiceProfile ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-surface-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded.voiceProfile && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="space-y-4">
                  {report.writingDNA?.voiceSignature && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-brand-500/10 border border-purple-500/10">
                      <p className="text-[10px] font-bold uppercase text-purple-400 mb-1">Voice Signature</p>
                      <p className="text-sm font-medium text-surface-200">{report.writingDNA.voiceSignature}</p>
                    </div>
                  )}
                  {report.writingDNA?.communicationStyle && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] font-bold uppercase text-brand-400 mb-1">Communication Style</p>
                      <p className="text-sm text-surface-200">{report.writingDNA.communicationStyle}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.writingDNA?.toneProfile && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] font-bold uppercase text-brand-400 mb-2">Tone</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded text-xs bg-brand-500/10 text-brand-400 font-medium">{report.writingDNA.toneProfile.primary}</span>
                          {report.writingDNA.toneProfile.secondary?.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-xs bg-surface-500/10 text-surface-400">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {report.writingDNA?.vocabularyProfile && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] font-bold uppercase text-brand-400 mb-2">Vocabulary</p>
                        <div className="flex flex-wrap gap-1.5">
                          {report.writingDNA.vocabularyProfile.favoriteWords?.slice(0, 5).map((w, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">{w}</span>
                          ))}
                          {report.writingDNA.vocabularyProfile.technicalTerms?.slice(0, 5).map((t, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {report.writingDNA?.structureProfile && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] font-bold uppercase text-brand-400 mb-2">Structure</p>
                        <div className="flex flex-wrap gap-1.5">
                          {report.writingDNA.structureProfile.usesBulletPoints && (
                            <span className="px-2 py-0.5 rounded text-xs bg-surface-500/10 text-surface-400">Bullets</span>
                          )}
                          {report.writingDNA.structureProfile.usesQuestions && (
                            <span className="px-2 py-0.5 rounded text-xs bg-surface-500/10 text-surface-400">Questions</span>
                          )}
                          {report.writingDNA.structureProfile.usesStories && (
                            <span className="px-2 py-0.5 rounded text-xs bg-surface-500/10 text-surface-400">Stories</span>
                          )}
                          <span className="px-2 py-0.5 rounded text-xs bg-surface-500/10 text-surface-400">~{report.writingDNA.structureProfile.avgSentenceLength} words/sentence</span>
                        </div>
                      </div>
                    )}
                    {report.writingDNA?.emotionalProfile && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] font-bold uppercase text-brand-400 mb-2">Emotional Profile</p>
                        <div className="space-y-2">
                          {Object.entries(report.writingDNA.emotionalProfile).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-[10px] text-surface-500 w-20 capitalize">{key}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                                <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                                  initial={{ width: 0 }} animate={{ width: `${val}%` }}
                                  transition={{ duration: 1, delay: 0.3 }} />
                              </div>
                              <span className="text-[10px] text-surface-400 w-8 text-right">{val}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {report.writingDNA?.hooks && report.writingDNA.hooks.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase text-surface-500 mb-2">Top Hooks</p>
                      <div className="space-y-2">
                        {report.writingDNA.hooks.slice(0, 3).map((hook, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 font-medium">{hook.type}</span>
                            <p className="text-sm text-surface-300 flex-1">"{hook.text}"</p>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-green-400" />
                              <span className="text-[10px] text-green-400">{hook.effectiveness}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.writingDNA?.formatPreferences && report.writingDNA.formatPreferences.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase text-surface-500 mb-2">Format Preferences</p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.writingDNA.formatPreferences.map((f, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-surface-500/10 text-surface-400 border border-surface-500/10">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <button onClick={() => toggle('contentOpps')} className="w-full flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">Content Opportunities</h3>
              <p className="text-sm text-surface-400 mt-1">AI-generated post ideas based on your profile</p>
            </div>
            <motion.div animate={{ rotate: expanded.contentOpps ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-surface-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded.contentOpps && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="space-y-3">
                  {report.contentOpportunities?.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-brand-400">{item.engagementScore}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-200">{item.topic}</p>
                        <p className="text-xs text-surface-500 mt-0.5">{item.reason}</p>
                        <span className="text-[10px] text-surface-600 uppercase font-medium mt-1 inline-block">{item.pillar}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-surface-600 flex-shrink-0" />
                    </motion.div>
                  ))}
                  {(!report.contentOpportunities || report.contentOpportunities.length === 0) && (
                    <div className="text-center py-8 text-surface-500">No content opportunities identified</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <button onClick={() => toggle('actionPlan')} className="w-full flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">AI Action Plan</h3>
              <p className="text-sm text-surface-400 mt-1">Quick wins and prioritized improvements</p>
            </div>
            <motion.div animate={{ rotate: expanded.actionPlan ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-surface-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expanded.actionPlan && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="space-y-4">
                  {report.quickWins && report.quickWins.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase text-green-400 mb-3 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" /> Quick Wins
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {report.quickWins.map((item, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span className="text-[10px] font-bold uppercase text-green-400">{item.category}</span>
                            </div>
                            <h4 className="text-sm font-semibold text-surface-200 mb-1">{item.action}</h4>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] text-green-400">Impact: {item.impact}</span>
                              <span className="text-[10px] text-surface-500">Effort: {item.effort}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.improvements && report.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase text-brand-400 mb-3 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" /> Improvements
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {report.improvements.map((item, i) => {
                          const pConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;
                          return (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
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
                    </div>
                  )}
                  {((!report.quickWins || report.quickWins.length === 0) && (!report.improvements || report.improvements.length === 0)) && (
                    <div className="text-center py-8 text-surface-500">No action items available</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>
    </StaggerContainer>

    <AnimatePresence>
      {showRawModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowRawModal(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-auto border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-surface-100">Raw Analysis Data</h3>
              <button onClick={() => setShowRawModal(false)} className="text-surface-400 hover:text-surface-200">Close</button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-surface-300 mb-2">LinkedIn Extracted Data</h4>
                <pre className="p-4 rounded-xl bg-black/30 text-xs text-green-400/80 overflow-auto max-h-60 font-mono">
                  {JSON.stringify(report?.linkedinAnalysis, null, 2) || 'No data'}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-surface-300 mb-2">Resume Extracted Data</h4>
                <pre className="p-4 rounded-xl bg-black/30 text-xs text-blue-400/80 overflow-auto max-h-60 font-mono">
                  {JSON.stringify(report?.resumeAnalysis, null, 2) || 'No data'}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-surface-300 mb-2">GitHub Data</h4>
                <pre className="p-4 rounded-xl bg-black/30 text-xs text-purple-400/80 overflow-auto max-h-60 font-mono">
                  {JSON.stringify(report?.githubAnalysis, null, 2) || 'No data'}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-surface-300 mb-2">Profile Health</h4>
                <pre className="p-4 rounded-xl bg-black/30 text-xs text-amber-400/80 overflow-auto max-h-60 font-mono">
                  {JSON.stringify(report?.profileHealth, null, 2) || 'No data'}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-surface-300 mb-2">Full Report</h4>
                <pre className="p-4 rounded-xl bg-black/30 text-xs text-cyan-400/80 overflow-auto max-h-60 font-mono">
                  {JSON.stringify(report, null, 2) || 'No data'}
                </pre>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
