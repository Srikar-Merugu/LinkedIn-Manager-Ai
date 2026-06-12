'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Copy, Download, RefreshCw, AlertTriangle, Database, FileText, Github, Brain, Server } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DebugSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  data: any;
  loading: boolean;
  error: string | null;
}

function countFields(obj: any): string {
  if (obj === null || obj === undefined) return 'empty';
  if (typeof obj !== 'object') return '1 field';
  if (Array.isArray(obj)) {
    const count = obj.length;
    return `${count} item${count !== 1 ? 's' : ''}`;
  }
  const keys = Object.keys(obj);
  return `${keys.length} field${keys.length !== 1 ? 's' : ''}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function downloadJson(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DebugSectionCard({ section, onToggle, isOpen }: {
  section: DebugSection;
  onToggle: () => void;
  isOpen: boolean;
}) {
  const jsonStr = section.data ? JSON.stringify(section.data, null, 2) : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${section.color}`}>
            {section.icon}
          </div>
          <div className="text-left">
            <span className="text-sm font-medium text-white/90">{section.label}</span>
            {!section.loading && section.data && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                {countFields(section.data)}
              </span>
            )}
          </div>
          {section.error && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Error</span>
          )}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-white/40" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5">
              {section.loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-white/40">Loading...</span>
                </div>
              ) : section.error ? (
                <div className="p-5 text-sm text-red-400/80">{section.error}</div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => copyToClipboard(jsonStr)}
                    className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white/60 hover:text-white/80 transition-all"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                  <pre className="p-5 text-xs text-green-400/80 bg-black/30 max-h-[500px] overflow-auto font-mono leading-relaxed">
                    {jsonStr || 'No data available'}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DebugPage() {
  const { user } = useAuth();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [sections, setSections] = useState<DebugSection[]>([
    { id: 'linkedinAnalysis', label: 'LinkedIn PDF Extracted Data', icon: <FileText className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-400', data: null, loading: false, error: null },
    { id: 'resumeAnalysis', label: 'Resume Extracted Data', icon: <FileText className="w-4 h-4" />, color: 'bg-purple-500/20 text-purple-400', data: null, loading: false, error: null },
    { id: 'githubAnalysis', label: 'GitHub Extracted Data', icon: <Github className="w-4 h-4" />, color: 'bg-gray-500/20 text-gray-400', data: null, loading: false, error: null },
    { id: 'aiInput', label: 'AI Input', icon: <Brain className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400', data: null, loading: false, error: null },
    { id: 'aiOutput', label: 'AI Output', icon: <Server className="w-4 h-4" />, color: 'bg-emerald-500/20 text-emerald-400', data: null, loading: false, error: null },
    { id: 'mongodbData', label: 'MongoDB Saved Data', icon: <Database className="w-4 h-4" />, color: 'bg-cyan-500/20 text-cyan-400', data: null, loading: false, error: null },
    { id: 'onboardingState', label: 'Onboarding State', icon: <Server className="w-4 h-4" />, color: 'bg-pink-500/20 text-pink-400', data: null, loading: false, error: null },
    { id: 'dashboardData', label: 'Dashboard Data', icon: <Server className="w-4 h-4" />, color: 'bg-indigo-500/20 text-indigo-400', data: null, loading: false, error: null },
  ]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchSection = async (index: number, fetcher: () => Promise<any>) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, loading: true, error: null } : s));
    try {
      const data = await fetcher();
      setSections(prev => prev.map((s, i) => i === index ? { ...s, data, loading: false } : s));
    } catch (e: any) {
      setSections(prev => prev.map((s, i) => i === index ? { ...s, loading: false, error: e?.message || 'Failed to fetch' } : s));
    }
  };

  const fetchAll = async () => {
    setLastRefresh(new Date());

    const fetchers: (() => Promise<any>)[] = [
      async () => {
        try {
          const report = await api.report.get();
          return report?.linkedinAnalysis || report?.analysis?.linkedinAnalysis || { note: 'No LinkedIn analysis found', rawReport: report };
        } catch { return null; }
      },
      async () => {
        try {
          const report = await api.report.get();
          return report?.resumeAnalysis || report?.analysis?.resumeAnalysis || { note: 'No resume analysis found', rawReport: report };
        } catch { return null; }
      },
      async () => {
        try {
          const report = await api.report.get();
          return report?.githubAnalysis || report?.analysis?.githubAnalysis || { note: 'No GitHub analysis found', rawReport: report };
        } catch { return null; }
      },
      async () => {
        try {
          const report = await api.report.get();
          return report?.aiInput || report?.promptData || { note: 'No AI input data found', rawReport: report };
        } catch { return null; }
      },
      async () => {
        try {
          const report = await api.report.get();
          return report || { note: 'No report data found' };
        } catch { return null; }
      },
      async () => {
        try {
          const report = await api.report.get();
          return report || { note: 'No MongoDB data found' };
        } catch { return null; }
      },
      async () => {
        try {
          return await api.onboarding.getState();
        } catch { return null; }
      },
      async () => {
        try {
          return await api.dashboard.get();
        } catch { return null; }
      },
    ];

    await Promise.all(
      fetchers.map((fetcher, index) => fetchSection(index, fetcher))
    );
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const exportAll = () => {
    const exportData: Record<string, any> = {};
    sections.forEach(s => {
      exportData[s.id] = s.data;
    });
    downloadJson(exportData, `debug-export-${new Date().toISOString().slice(0, 19)}.json`);
  };

  const allData = sections.reduce((acc, s) => {
    acc[s.id] = s.data;
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white/90">Admin Debug Console</h1>
            <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 rounded-md">
              DEBUG
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white/80 hover:bg-white/10 transition-all"
            >
              <Download className="w-4 h-4" />
              Export All Data
            </button>
            <button
              onClick={fetchAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/20 border border-brand-500/30 text-sm text-brand-400 hover:bg-brand-500/30 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh All
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-400/80">This page is for development/debugging only</span>
        </div>

        {lastRefresh && (
          <p className="text-xs text-white/30">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
        )}

        <div className="space-y-3">
          {sections.map((section) => (
            <DebugSectionCard
              key={section.id}
              section={section}
              onToggle={() => toggleSection(section.id)}
              isOpen={!!openSections[section.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
