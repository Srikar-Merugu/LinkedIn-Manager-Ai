'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronRight, Download, Share2, CheckCircle2, AlertTriangle, XCircle,
  Target, Lightbulb, TrendingUp, ArrowRight, Loader2, FileText, ExternalLink, Code2,
  Briefcase, GraduationCap, Award, Star, BarChart3,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

interface AnalysisReport {
  _id?: string;
  linkedinAnalysis?: {
    username?: string;
    fullName?: string;
    headline?: string;
    about?: string;
    location?: string;
    experience?: any[];
    education?: any[];
    skills?: string[];
    certifications?: any[];
    projects?: any[];
    industry?: string;
    connections?: string;
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
  contentPillars?: { name: string; description: string; score: number; topics: string[]; authorityScore: number; engagementPotential: number; careerAlignment: number }[];
  contentOpportunities?: { topic: string; reason: string; engagementScore: number; pillar: string }[];
  improvements?: { title: string; priority: 'high' | 'medium' | 'low'; impact: string; effort: string; description: string }[];
  profileScore?: number;
  profileHealth?: { section: string; status: 'strong' | 'good' | 'needs_improvement' | 'missing'; details: string }[];
  missingSections?: { section: string; priority: 'high' | 'medium' | 'low'; reason: string }[];
  aiSummary?: string;
  generatedAt?: string;
}

function ScoreGauge({ score, size = 160 }: { score: number; size?: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const r = (size - 16) / 2;
  const stroke = 8;
  const norm = r - stroke / 2;
  const circ = 2 * Math.PI * norm;
  const off = circ - (pct / 100) * circ;
  const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#60a5fa' : pct >= 40 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={norm} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-surface-800" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={norm}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-bold tabular-nums" style={{ color, fontSize: size * 0.28 }}
          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
          {pct}
        </motion.span>
        <span className="text-surface-500" style={{ fontSize: size * 0.08 }}>/ 100</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, expanded, onToggle, count }: {
  title: string; subtitle?: string; expanded: boolean; onToggle: () => void; count?: number;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold text-surface-100 group-hover:text-white transition-colors">{title}</h3>
        {count !== undefined && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-800 text-surface-400 font-medium">{count}</span>
        )}
        {subtitle && <span className="text-xs text-surface-500 hidden sm:inline">— {subtitle}</span>}
      </div>
      <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronDown className="w-4 h-4 text-surface-500" />
      </motion.div>
    </button>
  );
}

function HealthDot({ status }: { status: string }) {
  const c = status === 'strong' ? 'bg-green-500' : status === 'good' ? 'bg-blue-500' : status === 'needs_improvement' ? 'bg-amber-500' : 'bg-red-500';
  return <div className={cn('w-2 h-2 rounded-full flex-shrink-0', c)} />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    strong: { label: 'Strong', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
    good: { label: 'Good', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    needs_improvement: { label: 'Needs Work', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    missing: { label: 'Missing', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const s = map[status] || map.missing;
  return <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider', s.cls)}>{s.label}</span>;
}

export default function LinkedInAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    score: true, health: true, missing: true, strengths: true,
    improvements: true, projects: true, certifications: true, content: true,
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

  const toggle = (s: string) => setExpanded(prev => ({ ...prev, [s]: !prev[s] }));

  const mergedData = useMemo(() => {
    if (!report) return null;
    const li = report.linkedinAnalysis || {};
    const rs = report.resumeAnalysis || {};

    const allSkills = Array.from(new Set([...(li.skills || []), ...(rs.skills || [])]));
    const allCerts = [...(li.certifications || []), ...(rs.certifications || [])];
    const allProjects = [...(li.projects || []), ...(rs.projects || [])];
    const allExperience = [...(li.experience || []), ...(rs.experience || [])];
    const allEducation = [...(li.education || [])];

    return { allSkills, allCerts, allProjects, allExperience, allEducation, li, rs };
  }, [report]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    } catch {}
  };

  const handleExportPDF = () => {
    if (!report || !mergedData) return;
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const m = 20;
      const cw = pw - m * 2;
      let y = m;

      const check = (n: number) => { if (y + n > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = m; } };
      const addSection = (title: string) => { check(20); doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.text(title, m, y); y += 10; };

      doc.setFillColor(15, 15, 25);
      doc.rect(0, 0, pw, doc.internal.pageSize.getHeight(), 'F');

      doc.setFontSize(10); doc.setTextColor(120, 120, 150);
      doc.text('LinkedIn AI Manager', m, 30);
      doc.setFontSize(28); doc.setTextColor(255, 255, 255);
      doc.text('LinkedIn Analysis Report', m, 55);
      doc.setFontSize(12); doc.setTextColor(150, 150, 180);
      const dt = report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
      doc.text(`Generated: ${dt}`, m, 68);

      const ps = report.profileScore || 0;
      doc.setFontSize(42); doc.setTextColor(100, 130, 255); doc.text(`${ps}/100`, m, 110);
      doc.setFontSize(14); doc.setTextColor(200, 200, 220);
      doc.text(ps >= 80 ? 'Excellent' : ps >= 60 ? 'Good' : ps >= 40 ? 'Needs Improvement' : 'Getting Started', m, 125);

      doc.addPage(); doc.setFillColor(15, 15, 25); doc.rect(0, 0, pw, doc.internal.pageSize.getHeight(), 'F'); y = m;

      if (report.profileHealth?.length) {
        addSection('Profile Completeness');
        report.profileHealth.forEach(h => {
          check(8);
          const sc = h.status === 'strong' ? [80, 200, 120] : h.status === 'good' ? [100, 150, 255] : h.status === 'needs_improvement' ? [255, 180, 50] : [255, 80, 80];
          doc.setFontSize(8); doc.setTextColor(...sc as [number, number, number]); doc.text(`[${h.status.toUpperCase()}]`, m, y);
          doc.setTextColor(200, 200, 220); doc.text(`${h.section}: ${h.details}`, m + 30, y); y += 6;
        });
        y += 5;
      }

      if (mergedData.allSkills.length > 0) {
        addSection(`Skills (${mergedData.allSkills.length})`);
        doc.setFontSize(9); doc.setTextColor(200, 200, 220);
        mergedData.allSkills.forEach(s => { check(6); doc.text(`• ${s}`, m + 4, y); y += 5; });
        y += 5;
      }

      if (mergedData.allCerts.length > 0) {
        addSection(`Certifications (${mergedData.allCerts.length})`);
        doc.setFontSize(9); doc.setTextColor(200, 200, 220);
        mergedData.allCerts.forEach(c => { check(6); doc.text(`• ${c.name || c}`, m + 4, y); y += 5; });
        y += 5;
      }

      if (mergedData.allProjects.length > 0) {
        addSection(`Projects (${mergedData.allProjects.length})`);
        doc.setFontSize(9); doc.setTextColor(200, 200, 220);
        mergedData.allProjects.forEach(p => { check(6); doc.text(`• ${p.name || p.title || 'Project'}`, m + 4, y); y += 5; });
        y += 5;
      }

      if (report.strengths?.length) {
        addSection('Top Strengths');
        report.strengths.forEach(s => {
          check(10); doc.setFontSize(9); doc.setTextColor(80, 200, 120); doc.text('+', m, y);
          doc.setTextColor(255, 255, 255); doc.text(s.title, m + 6, y); y += 5;
          doc.setTextColor(150, 150, 180); const dl = doc.splitTextToSize(s.description, cw - 10); doc.text(dl, m + 6, y); y += dl.length * 4 + 4;
        });
      }

      if (report.improvements?.length) {
        addSection('Improvements');
        report.improvements.slice(0, 5).forEach(imp => {
          check(10); doc.setFontSize(9); doc.setTextColor(255, 160, 80); doc.text('-', m, y);
          doc.setTextColor(255, 255, 255); doc.text(imp.title, m + 6, y); y += 5;
          doc.setTextColor(150, 150, 180); doc.text(imp.description, m + 6, y); y += 8;
        });
      }

      check(20); y = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8); doc.setTextColor(80, 80, 100);
      doc.text('Generated by LinkedIn AI Manager', m, y);

      doc.save(`LinkedIn_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally { setExporting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
        <p className="text-surface-400 text-sm">Loading analysis...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-surface-100 mb-2">Failed to Load</h2>
        <p className="text-surface-400 text-sm mb-6">{error}</p>
        <button onClick={loadReport} className="btn-primary inline-flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  );

  if (!report) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <Target className="w-10 h-10 text-brand-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-surface-100 mb-2">No Analysis Found</h2>
        <p className="text-surface-400 text-sm mb-6">Complete onboarding to see your analysis</p>
        <a href="/onboarding" className="btn-primary inline-flex items-center gap-2 text-sm">
          <ArrowRight className="w-4 h-4" /> Go to Onboarding
        </a>
      </div>
    </div>
  );

  if (!mergedData) return null;

  const ps = report.profileScore || 0;
  const scoreLabel = ps >= 80 ? 'Excellent' : ps >= 60 ? 'Good' : ps >= 40 ? 'Needs Work' : 'Getting Started';
  const scoreColor = ps >= 80 ? 'text-green-400' : ps >= 60 ? 'text-blue-400' : ps >= 40 ? 'text-amber-400' : 'text-red-400';

  const healthMap = { strong: 0, good: 0, needs_improvement: 0, missing: 0 };
  report.profileHealth?.forEach(h => { healthMap[h.status as keyof typeof healthMap]++; });
  const totalHealth = (healthMap.strong + healthMap.good + healthMap.needs_improvement + healthMap.missing) || 1;
  const completionPct = Math.round(((healthMap.strong + healthMap.good) / totalHealth) * 100);

  const profileStrength = ps >= 80 ? 'All-Star' : ps >= 60 ? 'Advanced' : ps >= 40 ? 'Intermediate' : 'Beginner';

  return (
    <StaggerContainer className="space-y-5">
      {/* Header */}
      <StaggerItem>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-surface-100 mb-0.5">LinkedIn Analysis</h1>
            <p className="text-surface-500 text-sm">Profile intelligence from your real data</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportPDF} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs text-brand-400 hover:bg-brand-500/20 transition-all font-medium disabled:opacity-50">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export PDF
            </button>
            <div className="relative">
              <button onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/[0.05] transition-all relative">
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
              <AnimatePresence>
                {shareTooltip && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute right-0 top-full mt-2 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-[11px] text-green-400 whitespace-nowrap z-10">
                    Copied!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </StaggerItem>

      {/* 1. Profile Score */}
      <StaggerItem>
        <GlassCard glow className="p-6">
          <SectionHeader title="Profile Score" subtitle={scoreLabel} expanded={expanded.score} onToggle={() => toggle('score')} />
          <AnimatePresence>
            {expanded.score && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="flex items-center gap-8 mt-5">
                  <div className="flex-shrink-0">
                    <ScoreGauge score={ps} size={140} />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-surface-500 mb-0.5">Completion</p>
                        <p className="text-2xl font-bold text-surface-100">{completionPct}%</p>
                      </div>
                      <div className="w-px h-8 bg-surface-800" />
                      <div>
                        <p className="text-xs text-surface-500 mb-0.5">Profile Strength</p>
                        <p className={cn('text-2xl font-bold', scoreColor)}>{profileStrength}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5"><HealthDot status="strong" /><span className="text-surface-400">{healthMap.strong} Strong</span></div>
                      <div className="flex items-center gap-1.5"><HealthDot status="good" /><span className="text-surface-400">{healthMap.good} Good</span></div>
                      <div className="flex items-center gap-1.5"><HealthDot status="needs_improvement" /><span className="text-surface-400">{healthMap.needs_improvement} Needs Work</span></div>
                      <div className="flex items-center gap-1.5"><HealthDot status="missing" /><span className="text-surface-400">{healthMap.missing} Missing</span></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 2. Profile Completeness */}
      <StaggerItem>
        <GlassCard className="p-6">
          <SectionHeader title="Profile Completeness" expanded={expanded.health} onToggle={() => toggle('health')} />
          <AnimatePresence>
            {expanded.health && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4">
                  {report.profileHealth?.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-surface-300">{item.section}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-[11px] text-surface-500 truncate">{item.details}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>

      {/* 3. Missing Items */}
      {report.missingSections && report.missingSections.length > 0 && (
        <StaggerItem>
          <GlassCard className="p-6">
            <SectionHeader title="Missing Items" subtitle="Add these to improve your score" expanded={expanded.missing}
              onToggle={() => toggle('missing')} count={report.missingSections.length} />
            <AnimatePresence>
              {expanded.missing && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="space-y-2 mt-4">
                    {report.missingSections.map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-surface-200">{item.section}</span>
                            <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                              item.priority === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400')}>
                              {item.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-surface-500 mt-0.5">{item.reason}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </StaggerItem>
      )}

      {/* 4. Top Strengths */}
      <StaggerItem>
        <GlassCard className="p-6">
          <SectionHeader title="Top Strengths" expanded={expanded.strengths} onToggle={() => toggle('strengths')}
            count={report.strengths?.length || 0} />
          <AnimatePresence>
            {expanded.strengths && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
                  {report.strengths?.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-green-500/5 border border-green-500/10">
                      <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-surface-200">{item.title}</p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">{item.category}</span>
                        </div>
                        <p className="text-[11px] text-surface-500 leading-relaxed">{item.description}</p>
                        {item.evidence?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.evidence.slice(0, 3).map((e, j) => (
                              <span key={j} className="px-1.5 py-0.5 rounded text-[9px] bg-green-500/10 text-green-400/80">{e}</span>
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

      {/* 5. Improvement Suggestions */}
      {report.improvements && report.improvements.length > 0 && (
        <StaggerItem>
          <GlassCard className="p-6">
            <SectionHeader title="Improvement Suggestions" subtitle="Actionable steps" expanded={expanded.improvements}
              onToggle={() => toggle('improvements')} count={Math.min(report.improvements.length, 5)} />
            <AnimatePresence>
              {expanded.improvements && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="space-y-2 mt-4">
                    {report.improvements.slice(0, 5).map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium text-surface-200">{item.title}</p>
                            <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                              item.priority === 'high' ? 'bg-red-500/10 text-red-400' : item.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-surface-500/10 text-surface-400')}>
                              {item.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-surface-500 leading-relaxed">{item.description}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-green-400">Impact: {item.impact}</span>
                            <span className="text-[10px] text-surface-500">Effort: {item.effort}</span>
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
      )}

      {/* 6. Projects */}
      {mergedData.allProjects.length > 0 && (
        <StaggerItem>
          <GlassCard className="p-6">
            <SectionHeader title="Projects" subtitle="From resume and GitHub" expanded={expanded.projects}
              onToggle={() => toggle('projects')} count={mergedData.allProjects.length} />
            <AnimatePresence>
              {expanded.projects && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
                    {mergedData.allProjects.map((project: any, i: number) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-2 mb-1">
                          <Code2 className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-surface-200 truncate">{project.name || project.title || 'Project'}</span>
                        </div>
                        {(project.description || project.summary) && (
                          <p className="text-[11px] text-surface-500 leading-relaxed line-clamp-2">{project.description || project.summary}</p>
                        )}
                        {project.url && (
                          <a href={project.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 mt-1.5">
                            <ExternalLink className="w-3 h-3" /> View
                          </a>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </StaggerItem>
      )}

      {/* 7. Certifications */}
      {mergedData.allCerts.length > 0 && (
        <StaggerItem>
          <GlassCard className="p-6">
            <SectionHeader title="Certifications" subtitle="From LinkedIn and resume" expanded={expanded.certifications}
              onToggle={() => toggle('certifications')} count={mergedData.allCerts.length} />
            <AnimatePresence>
              {expanded.certifications && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
                    {mergedData.allCerts.map((cert: any, i: number) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-200 truncate">{cert.name || cert}</p>
                          {cert.authority && <p className="text-[10px] text-surface-500">{cert.authority}</p>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </StaggerItem>
      )}

      {/* 8. Content Opportunities */}
      <StaggerItem>
        <GlassCard className="p-6">
          <SectionHeader title="Content Opportunities" subtitle="Based on your profile" expanded={expanded.content}
            onToggle={() => toggle('content')} count={report.contentOpportunities?.length || 0} />
          <AnimatePresence>
            {expanded.content && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="space-y-2 mt-4">
                  {report.contentPillars && report.contentPillars.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold uppercase text-surface-500 mb-2 tracking-wider">Content Pillars</p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.contentPillars.map((p, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-brand-500/10 text-brand-400 border border-brand-500/10 font-medium">{p.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.contentOpportunities?.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500/20 to-accent-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-400">{item.engagementScore}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-200">{item.topic}</p>
                        <p className="text-[11px] text-surface-500 mt-0.5">{item.reason}</p>
                        <span className="text-[9px] text-surface-600 uppercase font-medium mt-0.5 inline-block">{item.pillar}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-surface-600 flex-shrink-0" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
