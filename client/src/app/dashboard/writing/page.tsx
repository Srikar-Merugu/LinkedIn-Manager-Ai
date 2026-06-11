'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PenTool,
  AlertCircle,
  BookOpen,
  Hash,
  MessageSquare,
  BarChart3,
  Target,
  Link as LinkIcon,
  type LucideIcon,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';

type Report = {
  writingDNA: {
    voiceSignature: string;
    communicationStyle: string;
    toneProfile: { primary: string; secondary: string[] };
    vocabularyProfile: { favoriteWords: string[]; technicalTerms: string[]; avgWordLength: number };
    structureProfile: { avgSentenceLength: number; usesBulletPoints: boolean; usesQuestions: boolean; usesStories: boolean };
    hooks: { type: string; text: string; effectiveness: number }[];
    ctas: { type: string; text: string; effectiveness: number }[];
    formatPreferences: string[];
    emotionalProfile: { curiosity: number; authority: number; empathy: number };
  };
};

export default function WritingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.report.get();
        setReport(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-2">Something went wrong</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  const dna = report?.writingDNA;

  if (!dna) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <GradientBorder animate className="inline-flex mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <PenTool className="w-10 h-10 text-white" />
            </div>
          </GradientBorder>
          <h2 className="text-2xl font-bold text-surface-100 mb-3">Complete onboarding to see your writing DNA</h2>
          <p className="text-surface-400 mb-8 max-w-md mx-auto">
            Your writing analysis will appear here after you complete the onboarding process.
          </p>
          <a href="/onboarding" className="btn-primary gap-2 inline-flex items-center">
            <LinkIcon className="w-4 h-4" /> Go to Onboarding
          </a>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string | number; sub?: string }) => (
    <GlassCard>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <p className="text-sm text-surface-400">{label}</p>
          <p className="text-xl font-bold text-surface-100">{value}</p>
          {sub && <p className="text-xs text-surface-500 mt-1">{sub}</p>}
        </div>
      </div>
    </GlassCard>
  );

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Writing DNA</h1>
            <p className="text-surface-400 mt-1">Your analyzed writing voice and content DNA</p>
          </div>
        </div>
      </StaggerItem>

      {/* Voice Signature */}
      <StaggerItem>
        <GlassCard glow className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.03] to-accent-500/[0.03]" />
          <div className="relative p-8 text-center">
            <GradientBorder animate className="inline-flex mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
            </GradientBorder>
            <h2 className="text-2xl font-bold text-surface-100 mb-2">Voice Signature</h2>
            <p className="text-surface-300 max-w-2xl mx-auto text-lg">
              {dna.voiceSignature || 'Not yet determined'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {dna.communicationStyle || 'Unclassified'}
              </span>
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Tone Profile */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Tone Profile" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Primary Tone</h4>
              <span className="px-4 py-2 rounded-full bg-brand-500/10 text-brand-400 text-lg font-semibold border border-brand-500/20">
                {dna.toneProfile?.primary || 'Professional'}
              </span>
              <h4 className="text-sm font-semibold text-surface-300 mt-4 mb-3">Secondary Tones</h4>
              <div className="flex flex-wrap gap-2">
                {(dna.toneProfile?.secondary || []).map((t: string) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-surface-800 text-surface-400 text-sm">{t}</span>
                ))}
                {(!dna.toneProfile?.secondary || dna.toneProfile.secondary.length === 0) && (
                  <span className="text-sm text-surface-500">None detected</span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Vocabulary Profile */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Vocabulary Profile" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Favorite Words</h4>
              <div className="flex flex-wrap gap-2">
                {(dna.vocabularyProfile?.favoriteWords || []).slice(0, 10).map((w: string) => (
                  <span key={w} className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-sm">{w}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Technical Terms</h4>
              <div className="flex flex-wrap gap-2">
                {(dna.vocabularyProfile?.technicalTerms || []).slice(0, 8).map((t: string) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-accent-500/10 text-accent-400 text-sm">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Metrics</h4>
              <div className="space-y-3">
                <div className="text-sm text-surface-400">
                  Avg word: {dna.vocabularyProfile?.avgWordLength?.toFixed(1) || '?'} chars
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Structure Profile */}
      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Structure Profile" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Sentence Length', value: `${Math.round(dna.structureProfile?.avgSentenceLength || 0)} words` },
              { label: 'Bullet Points', value: dna.structureProfile?.usesBulletPoints ? 'Yes' : 'Rarely' },
              { label: 'Questions', value: dna.structureProfile?.usesQuestions ? 'Often' : 'Rarely' },
              { label: 'Stories', value: dna.structureProfile?.usesStories ? 'Often' : 'Rarely' },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4 border border-white/5 text-center">
                <p className="text-xs text-surface-400 mb-1">{stat.label}</p>
                <p className="text-sm font-semibold text-surface-200 capitalize">{stat.value}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </StaggerItem>

      {/* Hooks */}
      {(dna.hooks || []).length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Hooks" />
            <div className="space-y-3">
              {(dna.hooks || []).map((hook, i) => (
                <div key={i} className="flex items-center justify-between glass rounded-xl p-4 border border-white/5">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 text-xs font-medium mr-3">
                      {hook.type}
                    </span>
                    <span className="text-sm text-surface-300">{hook.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                        style={{ width: `${(hook.effectiveness || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-surface-400 w-10 text-right">
                      {Math.round((hook.effectiveness || 0) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}

      {/* CTAs */}
      {(dna.ctas || []).length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Calls to Action" />
            <div className="space-y-3">
              {(dna.ctas || []).map((cta, i) => (
                <div key={i} className="flex items-center justify-between glass rounded-xl p-4 border border-white/5">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-accent-500/10 text-accent-400 text-xs font-medium mr-3">
                      {cta.type}
                    </span>
                    <span className="text-sm text-surface-300">{cta.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                        style={{ width: `${(cta.effectiveness || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-surface-400 w-10 text-right">
                      {Math.round((cta.effectiveness || 0) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}

      {/* Format Preferences */}
      {(dna.formatPreferences || []).length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Format Preferences" />
            <div className="flex flex-wrap gap-2">
              {(dna.formatPreferences || []).map((fmt: string) => (
                <span key={fmt} className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-sm">{fmt}</span>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}

      {/* Emotional Profile */}
      {dna.emotionalProfile && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Emotional Profile" />
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(dna.emotionalProfile).map(([key, val]) => (
                <div key={key} className="glass rounded-xl p-4 border border-white/5 text-center">
                  <p className="text-xs text-surface-400 capitalize mb-2">{key}</p>
                  <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(val as number)}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                    />
                  </div>
                  <p className="text-xs text-surface-400 mt-1">{Math.round(val as number)}%</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}
