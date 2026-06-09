'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fingerprint,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  Globe,
  Palette,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type BrandDNA = {
  _id: string;
  userId: string;
  profileId?: string;
  archetype: string;
  archetypeConfidence: number;
  archetypeDescription: string;
  values: Array<{ name: string; weight: number; evidence: string[]; category: 'core' | 'secondary' | 'aspirational' }>;
  uniqueValueProposition: string;
  missionStatement: string;
  originStory: string;
  targetAudience: {
    primary: string[];
    secondary: string[];
    demographics: Record<string, string>;
    painPoints: string[];
    aspirations: string[];
  };
  brandTerritory: {
    owned: string[];
    adjacent: string[];
    avoid: string[];
    keywords: string[];
    hashtags: string[];
  };
  visualDirection: {
    colorPalette: string[];
    style: string;
    imageryThemes: string[];
  };
  competitorAnalysis: Array<{
    name: string;
    position: string;
    strengths: string[];
    weaknesses: string[];
    differentiation: string;
  }>;
  confidence: number;
  status: 'draft' | 'active' | 'archived';
  regeneratedAt?: string;
  createdAt: string;
};

export default function BrandPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dna, setDNA] = useState<BrandDNA | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const pid = params.get('profileId');
        setProfileId(pid);

        const stateRes = await api.onboarding.getState();
        const uid = stateRes.state.userId;
        setUserId(uid);

        const status = await api.brand.getStatus(uid);
        setVoiceStatus(status.voiceProfile);

        if (status.brandDna.exists) {
          const dnaData = await api.brand.getDNA(uid);
          setDNA(dnaData);
        }

        if (!pid && stateRes.state.connectedSources?.linkedin?.profileId) {
          setProfileId(stateRes.state.connectedSources.linkedin.profileId);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleGenerate = async () => {
    if (!profileId || !userId) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await api.brand.generate(profileId, userId);
      setDNA(result.dna || result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

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

  if (error && !dna) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-2">Something went wrong</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button onClick={handleGenerate} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dna) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <StaggerItem>
          <GlassCard glow className="text-center p-12 max-w-lg">
            <GradientBorder animate className="inline-flex mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <Fingerprint className="w-10 h-10 text-white" />
              </div>
            </GradientBorder>

            <h1 className="text-2xl font-bold text-surface-100 mb-3">
              Your Brand DNA
            </h1>
            <p className="text-surface-400 mb-8 leading-relaxed">
              Discover your professional archetype, core values, and unique brand identity.
              Generate your Brand DNA from your LinkedIn profile and onboarding data.
            </p>

            <button
              onClick={handleGenerate}
              disabled={generating || !profileId}
              className={cn(
                'btn-primary gap-2 px-8 py-3 text-base',
                (!profileId || generating) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate Brand DNA</>
              )}
            </button>

            {!profileId && (
              <p className="text-xs text-surface-500 mt-4">
                Connect your LinkedIn profile first to generate your Brand DNA
              </p>
            )}
          </GlassCard>
        </StaggerItem>
      </div>
    );
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Brand Identity</h1>
            <p className="text-surface-400 mt-1">
              Your AI-generated professional brand profile
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-secondary gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', generating && 'animate-spin')} />
              Regenerate
            </button>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <GlassCard glow className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.03] to-accent-500/[0.03]" />
          <div className="relative p-8 text-center">
            <GradientBorder animate className="inline-flex mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-white" />
              </div>
            </GradientBorder>
            <h2 className="text-3xl font-bold text-surface-100 mb-2">{dna.archetype}</h2>
            <p className="text-surface-400 max-w-2xl mx-auto mb-4">{dna.archetypeDescription}</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {Math.round(dna.archetypeConfidence * 100)}% confidence
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-800 text-surface-400 capitalize">
                {dna.status}
              </span>
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Unique Value Proposition" />
            <p className="text-surface-200 leading-relaxed">{dna.uniqueValueProposition}</p>
          </GlassCard>
        </StaggerItem>

        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Mission Statement" />
            <p className="text-surface-200 leading-relaxed italic">"{dna.missionStatement}"</p>
          </GlassCard>
        </StaggerItem>
      </div>

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Core Values" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dna.values.map((value) => (
              <div
                key={value.name}
                className="glass rounded-xl p-4 border border-white/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-surface-200">{value.name}</h4>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    value.category === 'core' && 'bg-brand-500/10 text-brand-400',
                    value.category === 'secondary' && 'bg-accent-500/10 text-accent-400',
                    value.category === 'aspirational' && 'bg-purple-500/10 text-purple-400',
                  )}>
                    {value.category}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value.weight * 100}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Target Audience" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Primary</h4>
              <div className="flex flex-wrap gap-2">
                {dna.targetAudience.primary.map((a) => (
                  <span key={a} className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-sm border border-brand-500/20">
                    {a}
                  </span>
                ))}
              </div>
              <h4 className="text-sm font-semibold text-surface-300 mt-4 mb-3">Secondary</h4>
              <div className="flex flex-wrap gap-2">
                {dna.targetAudience.secondary.map((a) => (
                  <span key={a} className="px-3 py-1 rounded-full bg-surface-800 text-surface-400 text-sm">
                    {a}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Pain Points</h4>
              <ul className="space-y-2">
                {dna.targetAudience.painPoints.map((p) => (
                  <li key={p} className="text-sm text-surface-400 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span> {p}
                  </li>
                ))}
              </ul>
              <h4 className="text-sm font-semibold text-surface-300 mt-4 mb-3">Aspirations</h4>
              <ul className="space-y-2">
                {dna.targetAudience.aspirations.map((a) => (
                  <li key={a} className="text-sm text-surface-400 flex items-start gap-2">
                    <span className="text-accent-400 mt-0.5">•</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Brand Territory" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-emerald-400 mb-3">Owned Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {dna.brandTerritory.owned.map((k) => (
                  <span key={k} className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm">
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-400 mb-3">Adjacent</h4>
              <div className="flex flex-wrap gap-2">
                {dna.brandTerritory.adjacent.map((k) => (
                  <span key={k} className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm">
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-3">Avoid</h4>
              <div className="flex flex-wrap gap-2">
                {dna.brandTerritory.avoid.map((k) => (
                  <span key={k} className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-sm">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {dna.brandTerritory.hashtags.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Suggested Hashtags</h4>
              <div className="flex flex-wrap gap-2">
                {dna.brandTerritory.hashtags.map((h) => (
                  <span key={h} className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-sm font-mono">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Visual Direction" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Color Palette</h4>
              <div className="flex gap-2">
                {dna.visualDirection.colorPalette.map((color, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="w-10 h-10 rounded-xl border border-white/10"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[10px] text-surface-500 font-mono">{color}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Visual Style</h4>
              <p className="text-surface-400 text-sm mb-4">{dna.visualDirection.style}</p>
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Imagery Themes</h4>
              <div className="flex flex-wrap gap-2">
                {dna.visualDirection.imageryThemes.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-surface-800 text-surface-400 text-sm">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Voice Profile" />
          <div className="flex items-center justify-between">
            <div>
              {voiceStatus?.exists ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-400" />
                  <span className="text-surface-200">
                    Voice profile {voiceStatus.status === 'ready' ? 'ready' : 'building'} &mdash; {voiceStatus.sampleCount} samples analyzed
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <span className="text-surface-400">No voice profile yet. Complete onboarding to generate one.</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      {dna.competitorAnalysis.length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Competitive Analysis" />
            <div className="space-y-4">
              {dna.competitorAnalysis.map((comp, i) => (
                <div key={i} className="glass rounded-xl p-5 border border-white/5">
                  <h4 className="font-semibold text-surface-200 mb-3">{comp.name}</h4>
                  <p className="text-sm text-surface-400 mb-3">{comp.position}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h5 className="text-xs font-semibold text-emerald-400 mb-2">Strengths</h5>
                      <ul className="space-y-1">
                        {comp.strengths.map((s) => (
                          <li key={s} className="text-xs text-surface-400">+ {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-red-400 mb-2">Weaknesses</h5>
                      <ul className="space-y-1">
                        {comp.weaknesses.map((w) => (
                          <li key={w} className="text-xs text-surface-400">- {w}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-brand-400 mb-2">Your Differentiation</h5>
                      <p className="text-xs text-surface-400">{comp.differentiation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Origin Story" />
          <p className="text-surface-300 leading-relaxed italic">{dna.originStory}</p>
        </GlassCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
