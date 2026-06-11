'use client';

import { motion } from 'framer-motion';
import { Trophy, Target, Lightbulb, TrendingUp, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ResultsStepProps {
  summary: Record<string, any> | null;
  onFinish: () => void;
}

export function ResultsStep({ summary, onFinish }: ResultsStepProps) {
  const scores = summary?.scores || {};
  const pillars = summary?.contentPillars || [];
  const quickWins = summary?.quickWins || [];
  const strategy = summary?.strategy90Day || [];
  const profileSummary = summary?.profileSummary || {};

  const scoreItems = [
    { label: 'Technical Leadership', score: scores.technicalLeadership || 0, color: 'from-brand-500 to-brand-600' },
    { label: 'Content Readiness', score: scores.contentReadiness || 0, color: 'from-accent-500 to-accent-600' },
    { label: 'Industry Authority', score: scores.industryAuthority || 0, color: 'from-amber-500 to-amber-600' },
    { label: 'Personal Brand', score: scores.personalBrand || 0, color: 'from-purple-500 to-purple-600' },
    { label: 'Career Opportunity', score: scores.careerOpportunity || 0, color: 'from-rose-500 to-rose-600' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg mb-4">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Your Brand Intelligence</h2>
        <p className="text-surface-400">Real analysis based on your profile data.</p>
      </motion.div>

      {profileSummary.strengths?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 mb-4"
        >
          <h3 className="text-sm font-semibold text-accent-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Strengths
          </h3>
          <div className="space-y-2">
            {profileSummary.strengths.map((s: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm text-surface-300">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                {s}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {profileSummary.weaknesses?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5 mb-4"
        >
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Areas to Improve
          </h3>
          <div className="space-y-2">
            {profileSummary.weaknesses.map((w: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm text-surface-300">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {w}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {scoreItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-surface-400">{item.label}</span>
              <span className="text-lg font-bold text-white">{item.score}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${item.score}%` }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {pillars.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-5 mb-4"
        >
          <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-400" /> Your Content Pillars
          </h3>
          <div className="flex flex-wrap gap-2">
            {pillars.map((pillar: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm text-brand-400">
                {pillar}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {quickWins.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-5 mb-4"
        >
          <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" /> Quick Wins
          </h3>
          <div className="space-y-2">
            {quickWins.map((win: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02]">
                <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  win.impact === 'high' ? 'bg-accent-500/20 text-accent-400' : 'bg-surface-700 text-surface-400'
                }`}>
                  {win.impact}
                </div>
                <span className="text-sm text-surface-300">{win.action}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {strategy.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl p-5 mb-6"
        >
          <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" /> 90-Day Strategy
          </h3>
          <div className="space-y-3">
            {strategy.map((phase: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-brand-400">{phase.week}</span>
                  <span className="text-xs text-surface-500">— {phase.focus}</span>
                </div>
                <ul className="space-y-1">
                  {phase.tasks.map((task: string, j: number) => (
                    <li key={j} className="text-xs text-surface-400 flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-surface-600 mt-1.5 flex-shrink-0" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <button onClick={onFinish} className="btn-primary w-full py-3.5 gap-2">
        Go to Dashboard <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
