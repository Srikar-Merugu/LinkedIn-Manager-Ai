'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PenTool,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Hash,
  MessageSquare,
  Target,
  Loader2,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type WritingStatus = {
  writingDNA: {
    exists: boolean;
    version: number;
    confidence: number;
    sampleCount: number;
    totalWords: number;
    voiceSignature: string | null;
    communicationStyle: string | null;
    lastAnalyzed: string | null;
  };
  learningHistory: {
    snapshotCount: number;
    hasEnoughSamples: boolean;
  };
  recentScores: Array<{
    scores: { overall: number };
    contentPreview: string;
    analyzedAt: string;
  }>;
};

export default function WritingPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dna, setDNA] = useState<any>(null);
  const [status, setStatus] = useState<WritingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sampleText, setSampleText] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const stateRes = await api.onboarding.getState();
        const uid = stateRes.state.userId;
        setUserId(uid);

        const st = await api.writing.getStatus(uid);
        setStatus(st);

        if (st.writingDNA.exists) {
          const dnaData = await api.writing.getDNA(uid);
          setDNA(dnaData);
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
    if (!userId) return;
    setGenerating(true);
    setError(null);
    try {
      const texts = [sampleText].filter(Boolean);
      if (texts.length === 0) {
        // Try to fetch real data from onboarding state
        try {
          const stateData = await api.onboarding.getState();
          const state = stateData?.state;
          const resumeSummary = state?.connectedSources?.resume?.parsedData?.summary;
          const linkedinSummary = state?.connectedSources?.linkedin?.profileData?.summary;
          const careerGoals = state?.careerGoals || [];
          const analysisSummary = state?.analysisResult?.profileSummary;

          if (resumeSummary) texts.push(resumeSummary);
          if (linkedinSummary) texts.push(linkedinSummary);
          if (analysisSummary?.strengths?.length > 0) {
            texts.push(`My strengths include: ${analysisSummary.strengths.join(', ')}`);
          }
          if (careerGoals.length > 0) {
            texts.push(`My career goals are: ${careerGoals.join(', ')}`);
          }
        } catch {
          // If no data available, require user to provide sample text
        }
      }

      if (texts.length === 0) {
        setError('Please provide sample text so we can analyze your writing style');
        setGenerating(false);
        return;
      }

      const result = await api.writing.generate(userId, texts);
      setDNA(result.dna || result);
      const st = await api.writing.getStatus(userId);
      setStatus(st);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleScoreContent = async () => {
    if (!userId || !sampleText.trim()) return;
    try {
      const result = await api.writing.score(userId, sampleText);
      alert(`Voice Match Score: ${result.scores.overall}/100`);
    } catch (err: any) {
      setError(err.message);
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
          <button onClick={handleGenerate} className="btn-primary">Try Again</button>
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-secondary gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', generating && 'animate-spin')} />
              {dna ? 'Re-analyze' : 'Analyze Writing'}
            </button>
          </div>
        </div>
      </StaggerItem>

      {/* Status Cards */}
      <StaggerItem>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={PenTool} label="Sample Count" value={status?.writingDNA.sampleCount || 0} sub="texts analyzed" />
          <StatCard icon={BookOpen} label="Total Words" value={status?.writingDNA.totalWords || 0} sub="processed" />
          <StatCard icon={BarChart3} label="Confidence" value={status ? `${Math.round(status.writingDNA.confidence * 100)}%` : '0%'} sub={`v${status?.writingDNA.version || 0}`} />
          <StatCard icon={Hash} label="Snapshots" value={status?.learningHistory.snapshotCount || 0} sub="learning checkpoints" />
        </div>
      </StaggerItem>

      {!dna ? (
        <StaggerItem>
          <GlassCard glow className="text-center p-12 max-w-2xl mx-auto">
            <GradientBorder animate className="inline-flex mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <PenTool className="w-10 h-10 text-white" />
              </div>
            </GradientBorder>

            <h1 className="text-2xl font-bold text-surface-100 mb-3">Your Writing DNA</h1>
            <p className="text-surface-400 mb-8 leading-relaxed">
              Discover your unique writing voice — vocabulary patterns, tone fingerprints, storytelling style, and content format preferences.
            </p>

            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Paste a writing sample (3+ paragraphs recommended)..."
              className="w-full h-32 glass rounded-xl p-4 text-sm text-surface-200 placeholder-surface-500 border border-white/5 focus:outline-none focus:border-brand-500/50 mb-4"
            />

            <button
              onClick={handleGenerate}
              disabled={generating || !userId}
              className={cn('btn-primary gap-2 px-8 py-3 text-base', (!userId || generating) && 'opacity-50 cursor-not-allowed')}
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate Writing DNA</>
              )}
            </button>
          </GlassCard>
        </StaggerItem>
      ) : (
        <>
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
                <p className="text-surface-300 max-w-2xl mx-auto text-lg">{dna.voiceSignature}</p>
                <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                  <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {dna.communicationStyle}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20">
                    {Math.round(dna.overallConfidence * 100)}% confidence
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
                    {dna.toneProfile.primary}
                  </span>
                  <h4 className="text-sm font-semibold text-surface-300 mt-4 mb-3">Secondary Tones</h4>
                  <div className="flex flex-wrap gap-2">
                    {dna.toneProfile.secondary?.map((t: string) => (
                      <span key={t} className="px-3 py-1 rounded-full bg-surface-800 text-surface-400 text-sm">{t}</span>
                    ))}
                    {(!dna.toneProfile.secondary || dna.toneProfile.secondary.length === 0) && (
                      <span className="text-sm text-surface-500">None detected</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-surface-300 mb-3">Tone Range</h4>
                  <div className="flex flex-wrap gap-2">
                    {dna.toneProfile.toneRange?.map((t: string) => (
                      <span key={t} className="px-3 py-1 rounded-full bg-surface-800 text-surface-400 text-sm">{t}</span>
                    ))}
                  </div>
                  <h4 className="text-sm font-semibold text-surface-300 mt-4 mb-3">Avoided Tones</h4>
                  <div className="flex flex-wrap gap-2">
                    {dna.toneProfile.avoidedTones?.map((t: string) => (
                      <span key={t} className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-sm">{t}</span>
                    ))}
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
                    {dna.vocabularyProfile.favoriteWords?.slice(0, 10).map((w: string) => (
                      <span key={w} className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-sm">{w}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-surface-300 mb-3">Technical Terms</h4>
                  <div className="flex flex-wrap gap-2">
                    {dna.vocabularyProfile.technicalTerms?.slice(0, 8).map((t: string) => (
                      <span key={t} className="px-3 py-1 rounded-full bg-accent-500/10 text-accent-400 text-sm">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-surface-300 mb-3">Metrics</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-surface-400">Word Complexity</span>
                        <span className="text-surface-300">{Math.round((dna.vocabularyProfile.wordComplexity || 0) * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(dna.vocabularyProfile.wordComplexity || 0) * 100}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-surface-400">Richness</span>
                        <span className="text-surface-300">{Math.round((dna.vocabularyProfile.vocabularyRichness || 0) * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(dna.vocabularyProfile.vocabularyRichness || 0) * 100}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                        />
                      </div>
                    </div>
                    <div className="text-sm text-surface-400">
                      Avg word: {dna.vocabularyProfile.avgWordLength?.toFixed(1) || '?'} chars
                    </div>
                  </div>
                </div>
              </div>
              {dna.vocabularyProfile.fillerWords?.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-amber-400 mb-3">Watch for filler words</h4>
                  <div className="flex flex-wrap gap-2">
                    {dna.vocabularyProfile.fillerWords.map((w: string) => (
                      <span key={w} className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm">{w}</span>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </StaggerItem>

          {/* Structure Profile */}
          <StaggerItem>
            <GlassCard>
              <GlassCardHeader title="Structure Profile" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Sentence Length', value: `${Math.round(dna.structureProfile.avgSentenceLength || 0)} words` },
                  { label: 'Paragraph', value: dna.structureProfile.preferredParagraphLength || 'varied' },
                  { label: 'Bullet Points', value: dna.structureProfile.usesBulletPoints > 0.3 ? 'Yes' : 'Rarely' },
                  { label: 'Questions', value: dna.structureProfile.usesQuestions > 0.2 ? 'Often' : 'Rarely' },
                  { label: 'Stories', value: dna.structureProfile.usesStories > 0.3 ? 'Often' : 'Rarely' },
                  { label: 'Data Points', value: dna.structureProfile.usesDataPoints > 0.3 ? 'Often' : 'Rarely' },
                  { label: 'Emoji Usage', value: dna.structureProfile.emojiFrequency > 0.1 ? 'Yes' : 'Minimal' },
                  { label: 'Line Breaks', value: dna.structureProfile.lineBreakFrequency > 0.3 ? 'Frequent' : 'Standard' },
                ].map((stat) => (
                  <div key={stat.label} className="glass rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-xs text-surface-400 mb-1">{stat.label}</p>
                    <p className="text-sm font-semibold text-surface-200 capitalize">{stat.value}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </StaggerItem>

          {/* Format Preferences */}
          <StaggerItem>
            <GlassCard>
              <GlassCardHeader title="Content Format Preferences" />
              <div className="space-y-3">
                {dna.formatPreferences?.slice(0, 5).map((fmt: any) => (
                  <div key={fmt.format} className="flex items-center gap-4">
                    <span className="w-32 text-sm text-surface-300 capitalize">{fmt.format}</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(1 - fmt.rank / dna.formatPreferences.length) * 100}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                      />
                    </div>
                    <span className="text-xs text-surface-400 w-16 text-right">#{fmt.rank + 1}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </StaggerItem>

          {/* Emotional Profile */}
          <StaggerItem>
            <GlassCard>
              <GlassCardHeader title="Emotional Signature" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dna.emotionalProfile && Object.entries(dna.emotionalProfile).map(([key, val]) => (
                  <div key={key} className="glass rounded-xl p-4 border border-white/5">
                    <p className="text-xs text-surface-400 capitalize mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(val as number) * 100}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                      />
                    </div>
                    <p className="text-xs text-surface-400 mt-1">{Math.round((val as number) * 100)}%</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </StaggerItem>

          {/* Storytelling Blueprint */}
          <StaggerItem>
            <GlassCard>
              <GlassCardHeader title="Storytelling Blueprint" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-surface-300 mb-3">Preferred Arc</h4>
                  <p className="text-surface-200">{dna.storytellingBlueprint.preferredArc || 'Not detected'}</p>
                  <h4 className="text-sm font-semibold text-surface-300 mt-4 mb-3">Hook Style</h4>
                  <p className="text-surface-200">{dna.storytellingBlueprint.hookStyle || 'Not detected'}</p>
                  <h4 className="text-sm font-semibold text-surface-300 mt-4 mb-3">Lesson Delivery</h4>
                  <p className="text-surface-200">{dna.storytellingBlueprint.lessonDelivery || 'Not detected'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-surface-300 mb-3">Techniques</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Uses Anecdotes', value: dna.storytellingBlueprint.usesAnecdotes },
                      { label: 'Uses Data', value: dna.storytellingBlueprint.usesData },
                      { label: 'Uses Analogy', value: dna.storytellingBlueprint.usesAnalogy },
                    ].map((tech) => (
                      <div key={tech.label} className="flex items-center gap-3">
                        <div className={cn('w-4 h-4 rounded-full', tech.value ? 'bg-accent-500' : 'bg-surface-700')} />
                        <span className="text-sm text-surface-300">{tech.label}</span>
                      </div>
                    ))}
                  </div>
                  <h4 className="text-sm font-semibold text-surface-300 mt-4 mb-3">Narrative Structure</h4>
                  <div className="flex flex-wrap gap-2">
                    {dna.storytellingBlueprint.narrativeStructure?.map((s: string) => (
                      <span key={s} className="px-3 py-1 rounded-full bg-surface-800 text-surface-400 text-sm">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </StaggerItem>

          {/* Writing Rules */}
          {dna.writingRules?.length > 0 && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Writing Rules" />
                <ul className="space-y-3">
                  {dna.writingRules.map((rule: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-surface-300">
                      <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </StaggerItem>
          )}

          {/* Score Content */}
          <StaggerItem>
            <GlassCard>
              <GlassCardHeader title="Score Content Against Your Voice" />
              <div className="flex gap-4">
                <textarea
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  placeholder="Paste content to score against your Writing DNA..."
                  className="flex-1 h-24 glass rounded-xl p-4 text-sm text-surface-200 placeholder-surface-500 border border-white/5 focus:outline-none focus:border-brand-500/50"
                />
                <button
                  onClick={handleScoreContent}
                  disabled={!sampleText.trim()}
                  className="btn-secondary gap-2 self-end"
                >
                  <Target className="w-4 h-4" /> Score
                </button>
              </div>
            </GlassCard>
          </StaggerItem>

          {/* Recent Scores */}
          {status?.recentScores && status.recentScores.length > 0 && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Recent Voice Scores" />
                <div className="space-y-3">
                  {status.recentScores.map((score, i) => (
                    <div key={i} className="flex items-center justify-between glass rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold',
                          score.scores.overall >= 80 ? 'bg-accent-500/10 text-accent-400' :
                          score.scores.overall >= 60 ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400'
                        )}>
                          {score.scores.overall}
                        </div>
                        <div>
                          <p className="text-sm text-surface-300 truncate max-w-md">{score.contentPreview.slice(0, 100)}...</p>
                          <p className="text-xs text-surface-500">{new Date(score.analyzedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold',
                        score.scores.overall >= 80 ? 'bg-accent-500/10 text-accent-400' :
                        score.scores.overall >= 60 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      )}>
                        {score.scores.overall >= 80 ? 'Good match' : score.scores.overall >= 60 ? 'Needs work' : 'Poor match'}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </StaggerItem>
          )}

          {/* Recent Snapshots */}
          {status && (
            <StaggerItem>
              <GlassCard>
                <GlassCardHeader title="Learning History" />
                <p className="text-sm text-surface-400">
                  {status.learningHistory.snapshotCount} snapshot{status.learningHistory.snapshotCount !== 1 ? 's' : ''} taken
                  {status.learningHistory.hasEnoughSamples ? (
                    <span className="text-accent-400 ml-2">✓ Enough samples for analysis</span>
                  ) : (
                    <span className="text-amber-400 ml-2">Need 3+ samples for reliable analysis</span>
                  )}
                </p>
              </GlassCard>
            </StaggerItem>
          )}
        </>
      )}
    </StaggerContainer>
  );
}
