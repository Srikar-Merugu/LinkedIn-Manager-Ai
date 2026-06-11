'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Fingerprint,
  AlertCircle,
  Users,
  Globe,
  Palette,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type BrandDNA = {
  archetype: string;
  archetypeDescription: string;
  positioning: string;
  uniqueValueProposition: string;
  missionStatement: string;
  targetAudience: string;
  brandTerritory: string[];
  visualDirection: { colorPalette: string[]; style: string; imageryThemes: string[] };
  brandRules: { category: string; rule: string; priority: string }[];
  values: string[];
  originStory: string;
};

export default function BrandPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandDNA, setBrandDNA] = useState<BrandDNA | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const report = await api.report.get();
        const dna = report?.brandDNA;
        if (dna && (dna.archetype || dna.uniqueValueProposition || dna.missionStatement)) {
          setBrandDNA(dna);
        }
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
        </div>
      </div>
    );
  }

  if (!brandDNA) {
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
              Your Brand Identity
            </h1>
            <p className="text-surface-400 mb-8 leading-relaxed">
              Complete onboarding to see your brand identity, including your archetype, positioning, and unique value proposition.
            </p>

            <Link
              href="/onboarding"
              className="btn-primary gap-2 px-8 py-3 text-base inline-flex"
            >
              Go to Onboarding <ArrowRight className="w-5 h-5" />
            </Link>
          </GlassCard>
        </StaggerItem>
      </div>
    );
  }

  const dna = brandDNA;
  const visualDirection = dna.visualDirection || { colorPalette: [], style: '', imageryThemes: [] };
  const brandRules = dna.brandRules || [];
  const values = dna.values || [];
  const brandTerritory = dna.brandTerritory || [];

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Brand Identity</h1>
          <p className="text-surface-400 mt-1">
            Your AI-generated professional brand profile
          </p>
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
            <h2 className="text-3xl font-bold text-surface-100 mb-2">{dna.archetype || ''}</h2>
            <p className="text-surface-400 max-w-2xl mx-auto">{dna.archetypeDescription || ''}</p>
          </div>
        </GlassCard>
      </StaggerItem>

      {dna.positioning && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Positioning Statement" />
            <p className="text-surface-200 leading-relaxed">{dna.positioning}</p>
          </GlassCard>
        </StaggerItem>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Unique Value Proposition" />
            <p className="text-surface-200 leading-relaxed">{dna.uniqueValueProposition || ''}</p>
          </GlassCard>
        </StaggerItem>

        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Mission Statement" />
            <p className="text-surface-200 leading-relaxed italic">"{dna.missionStatement || ''}"</p>
          </GlassCard>
        </StaggerItem>
      </div>

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Target Audience" />
          <p className="text-surface-300 leading-relaxed">{dna.targetAudience || ''}</p>
        </GlassCard>
      </StaggerItem>

      {values.length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Values" />
            <div className="flex flex-wrap gap-2">
              {values.map((value) => (
                <span
                  key={value}
                  className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-sm border border-brand-500/20"
                >
                  {value}
                </span>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}

      {brandTerritory.length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Brand Territory" />
            <div className="flex flex-wrap gap-2">
              {brandTerritory.map((territory) => (
                <span
                  key={territory}
                  className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm"
                >
                  {territory}
                </span>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Visual Direction" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Color Palette</h4>
              {(visualDirection.colorPalette || []).length > 0 ? (
                <div className="flex gap-2">
                  {visualDirection.colorPalette.map((color: string, i: number) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-xl border border-white/10"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] text-surface-500 font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-surface-500 text-sm">No palette defined</p>
              )}
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Visual Style</h4>
              <p className="text-surface-400 text-sm mb-4">{visualDirection.style || ''}</p>
              <h4 className="text-sm font-semibold text-surface-300 mb-3">Imagery Themes</h4>
              <div className="flex flex-wrap gap-2">
                {(visualDirection.imageryThemes || []).map((theme: string) => (
                  <span key={theme} className="px-3 py-1 rounded-full bg-surface-800 text-surface-400 text-sm">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </StaggerItem>

      {brandRules.length > 0 && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Brand Rules" />
            <div className="space-y-3">
              {brandRules.map((rule, i) => (
                <div key={i} className="glass rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-surface-200">{rule.rule}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        rule.priority === 'high' && 'bg-red-500/10 text-red-400',
                        rule.priority === 'medium' && 'bg-amber-500/10 text-amber-400',
                        rule.priority === 'low' && 'bg-emerald-500/10 text-emerald-400',
                      )}>
                        {rule.priority}
                      </span>
                      <span className="text-xs text-surface-500">{rule.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      )}

      {dna.originStory && (
        <StaggerItem>
          <GlassCard>
            <GlassCardHeader title="Origin Story" />
            <p className="text-surface-300 leading-relaxed italic">{dna.originStory}</p>
          </GlassCard>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}
