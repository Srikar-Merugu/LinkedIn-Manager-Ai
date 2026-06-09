'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Briefcase, Search, Globe, Sparkles, Star, GraduationCap, TrendingUp, Users, Lightbulb } from 'lucide-react';

interface CareerGoalsStepProps {
  onComplete: (data: { goals: string[] }) => void;
}

const GOALS = [
  { id: 'internship', label: 'Internship', icon: GraduationCap, description: 'Looking for your first opportunity' },
  { id: 'job_search', label: 'Job Search', icon: Search, description: 'Actively seeking a new role' },
  { id: 'freelancing', label: 'Freelancing', icon: Briefcase, description: 'Building client-based work' },
  { id: 'startup_growth', label: 'Startup Growth', icon: TrendingUp, description: 'Growing your own venture' },
  { id: 'personal_branding', label: 'Personal Branding', icon: Sparkles, description: 'Building authority and presence' },
  { id: 'thought_leadership', label: 'Thought Leadership', icon: Lightbulb, description: 'Becoming an industry voice' },
  { id: 'career_change', label: 'Career Change', icon: Globe, description: 'Transitioning to a new field' },
  { id: 'networking', label: 'Networking', icon: Users, description: 'Expanding professional connections' },
  { id: 'skill_development', label: 'Skill Development', icon: Star, description: 'Learning and growing skills' },
];

export function CareerGoalsStep({ onComplete }: CareerGoalsStepProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleContinue = () => {
    if (selected.length > 0) onComplete({ goals: selected });
  };
  const canContinue = selected.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg mb-4">
          <Target className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Why are you on LinkedIn?</h2>
        <p className="text-surface-400">Select all that apply. This helps us tailor your strategy.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {GOALS.map((goal, i) => {
          const isSelected = selected.includes(goal.id);
          return (
            <motion.button
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggle(goal.id)}
              className={`flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200 ${
                isSelected
                  ? 'bg-brand-500/10 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                  : 'glass border border-white/5 hover:border-white/10'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isSelected ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-800 text-surface-400'
              }`}>
                <goal.icon className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-sm font-medium ${isSelected ? 'text-brand-300' : 'text-surface-200'}`}>{goal.label}</p>
                <p className="text-xs text-surface-500 mt-0.5">{goal.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <button onClick={handleContinue} disabled={!canContinue} className="btn-primary w-full py-3 gap-2">
        <Target className="w-5 h-5" />
        {canContinue ? `Continue with ${selected.length} goal${selected.length > 1 ? 's' : ''}` : 'Select at least one goal'}
      </button>
    </div>
  );
}
