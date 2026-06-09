'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Linkedin, FileText, Upload, Loader2, CheckCircle2, Trash2, Sparkles } from 'lucide-react';

interface VoiceTrainingStepProps {
  onComplete: (data: { samples: any[] }) => void;
  onSkip: () => void;
}

const SAMPLE_TYPES = [
  { id: 'linkedin_post', label: 'Import LinkedIn Posts', icon: Linkedin, desc: 'Pull your best posts from LinkedIn' },
  { id: 'blog', label: 'Upload Blog Posts', icon: FileText, desc: 'Share articles you\'ve written' },
  { id: 'writing_sample', label: 'Upload Writing Sample', icon: Upload, desc: 'Any piece of professional writing' },
];

export function VoiceTrainingStep({ onComplete, onSkip }: VoiceTrainingStepProps) {
  const [samples, setSamples] = useState<Array<{ sourceType: string; content: string; title?: string; contentType: string }>>([]);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addSample = async (type: string) => {
    if (type === 'linkedin_post') {
      setProcessing(true);
      await new Promise(r => setTimeout(r, 1500));
      setSamples(prev => [...prev, {
        sourceType: 'linkedin_post',
        content: 'Excited to share that I\'ve been working on something new... This has been an incredible journey and I\'m thrilled to finally talk about it. The past few months have taught me so much about building products people love.',
        title: 'Recent LinkedIn Post',
        contentType: 'text',
      }]);
      setProcessing(false);
    } else {
      inputRef.current?.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    for (let i = 0; i < files.length; i++) {
      setSamples(prev => [...prev, {
        sourceType: 'writing_sample',
        content: `Sample content from ${files[i].name}...`,
        title: files[i].name,
        contentType: 'text',
      }]);
    }
    setProcessing(false);
  };

  const removeSample = (idx: number) => setSamples(prev => prev.filter((_, i) => i !== idx));

  const handleComplete = async () => {
    if (samples.length === 0) {
      onSkip();
      return;
    }
    setCompleted(true);
    await new Promise(r => setTimeout(r, 800));
    onComplete({ samples });
  };

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg mb-4">
          <Mic className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Train Your Voice Profile</h2>
        <p className="text-surface-400">Help us understand your writing style so AI can match your voice perfectly.</p>
      </motion.div>

      <div className="space-y-3 mb-6">
        {SAMPLE_TYPES.map((type, i) => (
          <motion.button
            key={type.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => addSample(type.id)}
            disabled={processing}
            className="w-full flex items-center gap-4 p-4 rounded-xl glass border border-white/5 hover:border-white/10 text-left transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <type.icon className="w-5 h-5 text-brand-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-surface-200">{type.label}</p>
              <p className="text-xs text-surface-500">{type.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <input ref={inputRef} type="file" accept=".txt,.doc,.docx,.md" multiple onChange={handleFileUpload} className="hidden" />

      <AnimatePresence>
        {processing && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 mb-4">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
            <span className="text-sm text-surface-300">Processing samples...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {samples.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 mb-6 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-surface-400">{samples.length} sample{samples.length > 1 ? 's' : ''} added</span>
            <Sparkles className="w-4 h-4 text-brand-400" />
          </div>
          {samples.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-400" />
                <span className="text-sm text-surface-300 truncate max-w-[200px]">{s.title || `${s.sourceType} sample`}</span>
              </div>
              <button onClick={() => removeSample(i)} className="p-1 rounded-lg hover:bg-red-500/10 text-surface-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </motion.div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={handleComplete} disabled={processing || completed} className="btn-primary flex-1 py-3">
          {completed ? <><CheckCircle2 className="w-5 h-5" /> Voice Samples Saved</> : samples.length === 0 ? 'Skip this step' : `Save ${samples.length} Sample${samples.length > 1 ? 's' : ''}`}
        </button>
        {samples.length > 0 && (
          <button onClick={onSkip} className="btn-ghost px-6 py-3">Skip</button>
        )}
      </div>
    </div>
  );
}
