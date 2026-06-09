'use client';

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Target, Lightbulb, ArrowRight, Calendar, CheckCircle2, Star, Brain, Zap } from 'lucide-react';
import { useCallback } from 'react';

interface ResultsStepProps {
  summary: Record<string, any> | null;
  onFinish: () => Promise<void>;
}

export function ResultsStep({ summary, onFinish }: ResultsStepProps) {
  const handleClick = useCallback(async () => {
    console.log('[ResultsStep] Enter Dashboard clicked');
    try {
      await onFinish();
      console.log('[ResultsStep] markRedirected done, now navigating');
    } catch (e) {
      console.error('[ResultsStep] onFinish error:', e);
    }
    window.location.href = '/dashboard';
  }, [onFinish]);
  const strengths = [
    { label: 'Technical Leadership', score: 92, icon: Brain },
    { label: 'Content Readiness', score: 78, icon: Lightbulb },
    { label: 'Industry Authority', score: 85, icon: Star },
  ];

  const contentPillars = ['Engineering Leadership', 'System Design', 'Career Growth', 'Tech Innovation'];

  const opportunities = [
    { text: 'Write about your transition to tech lead', impact: 'high' as const, effort: 'low' as const },
    { text: 'Share your experience with distributed systems', impact: 'high' as const, effort: 'medium' as const },
    { text: 'Create a thread on career advice for engineers', impact: 'medium' as const, effort: 'low' as const },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-accent-400 to-accent-500 shadow-lg shadow-accent-500/25 mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-surface-100 mb-3">
          Your Brand Strategy is Ready
        </h1>
        <p className="text-surface-400">
          Based on your profile analysis, here's what we discovered.
        </p>
      </motion.div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {strengths.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="glass rounded-2xl p-5 text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto mb-3">
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-surface-100 mb-1">{s.score}</p>
            <p className="text-xs text-surface-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-surface-100">Your Content Pillars</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {contentPillars.map((pillar) => (
            <span key={pillar} className="px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm text-brand-400">
              {pillar}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-surface-100">Quick Wins</h3>
        </div>
        <div className="space-y-3">
          {opportunities.map((opp, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
              <div className={`w-2 h-2 rounded-full ${
                opp.impact === 'high' ? 'bg-accent-400' : 'bg-amber-400'
              }`} />
              <p className="flex-1 text-sm text-surface-300">{opp.text}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                opp.effort === 'low' ? 'bg-accent-500/10 text-accent-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {opp.effort} effort
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-accent-400" />
          <h3 className="font-semibold text-surface-100">90-Day Goal</h3>
        </div>
        <p className="text-sm text-surface-400 leading-relaxed">
          Publish 2 posts per week across your content pillars. Focus on sharing
          engineering insights and career stories to build authority in the tech leadership space.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <button
          onClick={handleClick}
          className="btn-primary text-base px-10 py-3.5 gap-2 glow-lg inline-flex"
        >
          Enter Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-xs text-surface-500 mt-3">Your full strategy is ready in the dashboard</p>
      </motion.div>
    </div>
  );
}
