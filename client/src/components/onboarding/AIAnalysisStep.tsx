'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Linkedin, FileText, Github, Globe, Sparkles, Target, PenLine, Mic, CheckCircle2, Loader2 } from 'lucide-react';

interface AIAnalysisStepProps {
  progress: number;
  log: string[];
  onProgressUpdate: (progress: number, logEntry?: string) => void;
  onComplete: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

const ANALYSIS_PHASES = [
  { start: 0, end: 15, label: 'Analyzing LinkedIn Profile', icon: Linkedin, color: 'from-blue-500 to-blue-600' },
  { start: 15, end: 30, label: 'Analyzing Resume', icon: FileText, color: 'from-amber-500 to-orange-500' },
  { start: 30, end: 40, label: 'Analyzing GitHub Activity', icon: Github, color: 'from-gray-500 to-gray-600' },
  { start: 40, end: 50, label: 'Analyzing Portfolio', icon: Globe, color: 'from-purple-500 to-pink-500' },
  { start: 50, end: 65, label: 'Building Brand DNA', icon: Brain, color: 'from-brand-500 to-brand-600' },
  { start: 65, end: 75, label: 'Creating Voice Profile', icon: Mic, color: 'from-rose-500 to-pink-500' },
  { start: 75, end: 85, label: 'Generating Content Strategy', icon: Target, color: 'from-emerald-500 to-teal-500' },
  { start: 85, end: 95, label: 'Identifying Growth Opportunities', icon: Sparkles, color: 'from-violet-500 to-purple-500' },
  { start: 95, end: 100, label: 'Finalizing Your Profile', icon: CheckCircle2, color: 'from-accent-500 to-accent-600' },
];

export function AIAnalysisStep({ progress, log, onProgressUpdate, onComplete }: AIAnalysisStepProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [text, setText] = useState('');
  const fullText = 'Analyzing your professional identity...';
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const p: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      p.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        duration: Math.random() * 4 + 3,
        delay: Math.random() * 2,
      });
    }
    setParticles(p);
  }, []);

  useEffect(() => {
    const idx = ANALYSIS_PHASES.findIndex(p => progress >= p.start && progress < p.end);
    if (idx >= 0) setCurrentPhaseIdx(idx);
    if (idx >= ANALYSIS_PHASES.length - 1 && progress >= 100) {
      setTimeout(() => onComplete(), 1000);
    }
  }, [progress, onComplete]);

  useEffect(() => {
    if (progress >= 100) return;
    intervalRef.current = setInterval(() => {
      const newProgress = progress >= 97 ? 100 : Math.min(progress + Math.random() * 3 + 1, 100);
      const phase = ANALYSIS_PHASES.find(p => newProgress >= p.start && newProgress < p.end);
      onProgressUpdate(newProgress, phase?.label);
    }, 1800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [progress, onProgressUpdate]);

  useEffect(() => {
    if (text.length < fullText.length) {
      const t = setTimeout(() => setText(fullText.slice(0, text.length + 1)), 50);
      return () => clearTimeout(t);
    }
  }, [text]);

  const currentPhase = ANALYSIS_PHASES[currentPhaseIdx];

  return (
    <div className="max-w-2xl mx-auto text-center relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-brand-400/30"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [p.opacity, p.opacity * 2, p.opacity],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10"
      >
        <div className="mb-8">
          <motion.div
            className="relative w-24 h-24 mx-auto mb-6"
            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-500/30 to-accent-500/30 blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-2xl">
              <Brain className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          <motion.p className="text-lg text-surface-300 font-mono mb-2 h-6" key={text.length}>{text}<span className="animate-pulse">|</span></motion.p>
          <p className="text-sm text-surface-500">AI is building your personal brand profile</p>
        </div>

        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentPhase?.color || 'from-brand-500 to-brand-600'} flex items-center justify-center`}>
              {currentPhase && <currentPhase.icon className="w-5 h-5 text-white" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-surface-200">{currentPhase?.label || 'Processing...'}</p>
              <p className="text-xs text-surface-500">{Math.round(progress)}% complete</p>
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden mb-4">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {ANALYSIS_PHASES.map((phase, i) => {
              const done = progress >= phase.end;
              const active = progress >= phase.start && progress < phase.end;
              return (
                <div key={phase.label} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-500 ${
                  done ? 'bg-accent-500/10' : active ? 'bg-brand-500/10' : 'bg-white/[0.02]'
                }`}>
                  <phase.icon className={`w-4 h-4 ${
                    done ? 'text-accent-400' : active ? 'text-brand-400' : 'text-surface-600'
                  }`} />
                  <p className={`text-[10px] text-center leading-tight ${
                    done ? 'text-accent-400' : active ? 'text-brand-400' : 'text-surface-600'
                  }`}>{phase.label.split(' ').slice(0, 2).join(' ')}</p>
                </div>
              );
            })}
          </div>
        </div>

        <motion.div className="glass rounded-2xl p-4 max-h-40 overflow-y-auto scrollbar-hide">
          <p className="text-xs text-surface-500 mb-2 text-left uppercase tracking-wider">Analysis Log</p>
          <AnimatePresence>
            {log.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 py-1"
              >
                <CheckCircle2 className="w-3 h-3 text-accent-400 flex-shrink-0" />
                <p className="text-xs text-surface-400 text-left">{entry}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {progress < 100 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 py-1"
            >
              <Loader2 className="w-3 h-3 text-brand-400 animate-spin flex-shrink-0" />
              <p className="text-xs text-surface-500">Processing...</p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
