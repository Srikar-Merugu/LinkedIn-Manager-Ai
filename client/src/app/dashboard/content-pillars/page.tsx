'use client';

import { useState, useEffect } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ContentPillar {
  name: string;
  description: string;
  score: number;
  topics: string[];
  authorityScore: number;
  engagementPotential: number;
  careerAlignment: number;
}

export default function ContentPillarsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [hasReport, setHasReport] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const report = await api.report.get();
        if (report?.contentPillars?.length) {
          setPillars(report.contentPillars);
          setHasReport(true);
        } else {
          setHasReport(false);
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
        <div>
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-surface-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!hasReport) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard glow className="text-center p-12 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-surface-100 mb-3">No Content Pillars Yet</h2>
          <p className="text-surface-400 mb-8 leading-relaxed">
            Complete onboarding to see your personalized content pillars.
          </p>
          <Link href="/onboarding" className="btn-primary gap-2 inline-flex">
            <LinkIcon className="w-4 h-4" />
            Go to Onboarding
          </Link>
        </GlassCard>
      </div>
    );
  }

  const maxScore = Math.max(...pillars.map(p => p.authorityScore || 0), 1);

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Content Pillars</h1>
          <p className="text-surface-400 mt-1">
            {pillars.length} pillar{pillars.length !== 1 ? 's' : ''} personalized to your profile
          </p>
        </div>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader title="Your Content Pillars" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pillars.map((pillar, i) => (
              <div key={i} className="glass rounded-xl p-5 border border-white/5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <h3 className="font-semibold text-surface-200">{pillar.name}</h3>
                    </div>
                    <p className="text-xs text-surface-400 mt-1">{pillar.description}</p>
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                      pillar.score >= 70
                        ? 'bg-accent-500/10 text-accent-400'
                        : pillar.score >= 40
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-surface-800 text-surface-500'
                    )}
                  >
                    {pillar.score}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center">
                    <p
                      className={cn(
                        'text-sm font-bold',
                        pillar.authorityScore >= 60
                          ? 'text-accent-400'
                          : pillar.authorityScore >= 35
                          ? 'text-amber-400'
                          : 'text-surface-500'
                      )}
                    >
                      {pillar.authorityScore}
                    </p>
                    <p className="text-[10px] text-surface-500">Authority</p>
                  </div>
                  <div className="text-center">
                    <p
                      className={cn(
                        'text-sm font-bold',
                        pillar.engagementPotential >= 60
                          ? 'text-accent-400'
                          : pillar.engagementPotential >= 35
                          ? 'text-amber-400'
                          : 'text-surface-500'
                      )}
                    >
                      {pillar.engagementPotential}
                    </p>
                    <p className="text-[10px] text-surface-500">Engagement</p>
                  </div>
                  <div className="text-center">
                    <p
                      className={cn(
                        'text-sm font-bold',
                        pillar.careerAlignment >= 60
                          ? 'text-accent-400'
                          : pillar.careerAlignment >= 35
                          ? 'text-amber-400'
                          : 'text-surface-500'
                      )}
                    >
                      {pillar.careerAlignment}
                    </p>
                    <p className="text-[10px] text-surface-500">Career</p>
                  </div>
                </div>

                {(pillar.topics || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {pillar.topics.slice(0, 5).map((topic, j) => (
                      <span
                        key={j}
                        className="text-[10px] bg-surface-800 text-surface-400 px-2 py-0.5 rounded"
                      >
                        {topic}
                      </span>
                    ))}
                    {pillar.topics.length > 5 && (
                      <span className="text-[10px] text-surface-500">
                        +{pillar.topics.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
