'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Sparkles, Send, FileText, BarChart3, RefreshCw, CheckCircle2,
  AlertTriangle, Target, Eye, PenSquare, Layers, Zap, Copy,
  ThumbsUp, TrendingUp, MessageSquare, Bookmark, Share2,
  ChevronDown, ChevronUp, Plus, Trash2, Save, RotateCcw,
} from 'lucide-react';

type Tab = 'create' | 'library' | 'scores' | 'variations' | 'voice' | 'career';

const CONTENT_TYPES = [
  { value: 'story', label: 'Story Post' },
  { value: 'educational', label: 'Educational Post' },
  { value: 'framework', label: 'Framework Post' },
  { value: 'contrarian', label: 'Contrarian Post' },
  { value: 'journey', label: 'Journey Post' },
  { value: 'career_lesson', label: 'Career Lesson' },
  { value: 'industry_commentary', label: 'Industry Commentary' },
  { value: 'thought_leadership', label: 'Thought Leadership' },
];

const SOURCE_TYPES = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'calendar', label: 'Content Calendar' },
  { value: 'opportunity', label: 'Opportunity Signal' },
  { value: 'strategy', label: 'Content Strategy' },
];

export default function ContentStudioPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [keyInsight, setKeyInsight] = useState('');
  const [contentType, setContentType] = useState('story');
  const [sourceType, setSourceType] = useState('manual');
  const [personalAngle, setPersonalAngle] = useState('');
  const [challenge, setChallenge] = useState('');
  const [outcome, setOutcome] = useState('');

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [postDetail, setPostDetail] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const userId = user?.id || '';

  useEffect(() => {
    if (userId) loadPosts();
  }, [userId]);

  async function loadPosts() {
    try {
      const data = await api.contentGeneration.getPosts(userId);
      setPosts(data || []);
    } catch { /* ignore */ }
  }

  async function handleGenerate() {
    if (!topic || !userId) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      // Fetch actual voice and brand profiles from server
      let voiceProfile = { vocabularyRules: [], toneRules: ['authentic'], storytellingRules: ['personal'], hookRules: [], ctaRules: [], communicationRules: ['clear'] };
      let brandProfile = { positioning: 'Professional', audience: [], expertise: [topic], authorityAreas: [], brandRules: [], brandVoice: 'Professional', targetIndustries: [], targetRoles: [] };

      try {
        const [voiceData, brandData] = await Promise.all([
          api.writing.getDNA(userId).catch(() => null),
          api.contentPillars.getAuthorityMap(userId).catch(() => null),
        ]);
        if (voiceData?.voiceProfile) voiceProfile = voiceData.voiceProfile;
        if (brandData?.brandProfile) brandProfile = brandData.brandProfile;
      } catch {
        // Use defaults if profiles not yet generated
      }

      const data = await api.contentGeneration.generate({
        userId,
        topic,
        context: context || `My experience with ${topic}`,
        keyInsight: keyInsight || topic,
        contentType,
        sourceType,
        sourceDescription: `Manual generation: ${topic}`,
        voiceProfile,
        brandProfile,
        personalAngle: personalAngle || undefined,
        challenge: challenge || undefined,
        outcome: outcome || undefined,
        careerGoals: [],
        currentRole: '',
      });
      setResult(data);
      if (data.success) {
        setTopic('');
        setContext('');
        setKeyInsight('');
        loadPosts();
      }
    } catch (e: any) {
      setError((e as Error).message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function loadPostDetail(postId: string) {
    setLoading(true);
    try {
      const data = await api.contentGeneration.getPostDetail(postId);
      setPostDetail(data);
      setSelectedPost(data?.post || null);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleSelectVariation(variationId: string) {
    await api.contentGeneration.selectVariation(variationId);
    if (selectedPost) loadPostDetail(selectedPost._id);
  }

  async function handleDeletePost(postId: string) {
    await api.contentGeneration.deletePost(postId);
    loadPosts();
    if (selectedPost?._id === postId) {
      setSelectedPost(null);
      setPostDetail(null);
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  }

  function getScoreBg(score: number): string {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-red-500/10 border-red-500/20';
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'create', label: 'Create', icon: PenSquare },
    { key: 'library', label: 'Library', icon: FileText },
    { key: 'scores', label: 'Scores', icon: BarChart3 },
    { key: 'variations', label: 'Variations', icon: Layers },
    { key: 'voice', label: 'Voice Match', icon: CheckCircle2 },
    { key: 'career', label: 'Career Fit', icon: Target },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">AI Content Studio</h1>
          <p className="text-sm text-surface-500 mt-1">Generate strategic, voice-aligned LinkedIn content</p>
        </div>
      </motion.div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.key ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-surface-400 hover:text-surface-200'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'create' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card rounded-2xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-surface-100 mb-4">Content Draft</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Content Type</label>
                  <select value={contentType} onChange={e => setContentType(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-200"
                  >
                    {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Source</label>
                  <select value={sourceType} onChange={e => setSourceType(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-200"
                  >
                    {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Topic *</label>
                  <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                    placeholder="e.g., Building my first SaaS product"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-200 placeholder:text-surface-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Context / Background</label>
                  <textarea value={context} onChange={e => setContext(e.target.value)} rows={3}
                    placeholder="What's the story behind this topic?"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-200 placeholder:text-surface-600 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Key Insight</label>
                  <textarea value={keyInsight} onChange={e => setKeyInsight(e.target.value)} rows={2}
                    placeholder="The main takeaway or lesson"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-200 placeholder:text-surface-600 resize-none"
                  />
                </div>
              </div>

              <motion.div initial={false} animate={{ height: expandedSections.advanced ? 'auto' : 0 }} className="overflow-hidden">
                <div className="pt-3 space-y-3">
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">Personal Angle</label>
                    <input type="text" value={personalAngle} onChange={e => setPersonalAngle(e.target.value)}
                      placeholder="Your unique perspective"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-200 placeholder:text-surface-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">Challenge / Obstacle</label>
                    <input type="text" value={challenge} onChange={e => setChallenge(e.target.value)}
                      placeholder="What made this difficult?"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-200 placeholder:text-surface-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">Outcome / Result</label>
                    <input type="text" value={outcome} onChange={e => setOutcome(e.target.value)}
                      placeholder="What happened in the end?"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-200 placeholder:text-surface-600"
                    />
                  </div>
                </div>
              </motion.div>

              <button onClick={() => setExpandedSections(prev => ({ ...prev, advanced: !prev.advanced }))}
                className="flex items-center gap-1 text-xs text-surface-500 hover:text-surface-300 mt-2"
              >
                {expandedSections.advanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Advanced Options
              </button>
            </div>

            {result && (
              <div className="glass-card rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-surface-100">
                    {result.success ? 'Generated Successfully' : 'Generation Failed'}
                  </h3>
                  {result.success && (
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-medium', getScoreColor(result.scoring?.overall))}>
                        Score: {result.scoring?.overall}/100
                      </span>
                    </div>
                  )}
                </div>

                {result.success && result.post ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-surface-100 font-medium mb-2">{result.post.title}</p>
                      <div className="text-sm text-surface-300 whitespace-pre-line leading-relaxed">
                        {result.post.fullContent}
                      </div>
                    </div>

                    {result.scoring && (
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(result.scoring.breakdown || {}).slice(0, 5).map(([key, val]) => (
                          <div key={key} className={cn('p-2 rounded-lg border text-center', getScoreBg(val as number))}>
                            <p className="text-xs text-surface-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className={cn('text-sm font-bold', getScoreColor(val as number))}>{String(val)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {result.review && result.review.issues?.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          Review: {result.review.aiScore > 30 ? 'AI-sounding phrases detected' : 'Content reads naturally'}
                        </div>
                        {result.review.issues.slice(0, 3).map((issue: any, i: number) => (
                          <p key={i} className="text-xs text-surface-400 ml-6">{issue.suggestion}</p>
                        ))}
                      </div>
                    )}

                    {result.optimization && (
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1 text-xs text-surface-400">
                          <MessageSquare className="w-3 h-3" /> Comments: {result.optimization.commentScore}%
                        </div>
                        <div className="flex items-center gap-1 text-xs text-surface-400">
                          <Bookmark className="w-3 h-3" /> Saves: {result.optimization.saveScore}%
                        </div>
                        <div className="flex items-center gap-1 text-xs text-surface-400">
                          <Share2 className="w-3 h-3" /> Shares: {result.optimization.shareScore}%
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-red-400 text-sm">{result.error || 'Generation failed'}</p>
                )}
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6 border border-white/5">
              <h3 className="text-sm font-semibold text-surface-100 mb-3">Generation Controls</h3>
              <button onClick={handleGenerate} disabled={!topic || generating}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  generating ? 'bg-brand-500/5 text-surface-500 cursor-wait' : 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25'
                )}
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate Post'}
              </button>

              {result?.success && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                    <span className="text-xs text-surface-400">Voice Match</span>
                    <span className={cn('text-xs font-bold', getScoreColor(result.scores?.voice?.overall))}>
                      {result.scores?.voice?.overall}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                    <span className="text-xs text-surface-400">Career Alignment</span>
                    <span className={cn('text-xs font-bold', getScoreColor(result.careerAlignment?.score))}>
                      {result.careerAlignment?.score}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                    <span className="text-xs text-surface-400">Quality Score</span>
                    <span className={cn('text-xs font-bold', getScoreColor(result.scoring?.overall))}>
                      {result.scoring?.overall}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                    <span className="text-xs text-surface-400">Generation Time</span>
                    <span className="text-xs text-surface-300">{result.generationTime}ms</span>
                  </div>
                </div>
              )}
            </div>

            {result?.variations && result.variations.length > 0 && (
              <div className="glass-card rounded-2xl p-6 border border-white/5">
                <h3 className="text-sm font-semibold text-surface-100 mb-3">Variations Generated</h3>
                <div className="space-y-2">
                  {result.variations.map((v: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                      <span className="text-sm text-surface-300">Version {v.version}</span>
                      <span className="text-xs text-surface-500 truncate max-w-[150px]">{v.angle?.substring(0, 50)}...</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'library' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100">Content Library</h2>
            <button onClick={loadPosts} className="flex items-center gap-1 text-xs text-surface-400 hover:text-surface-200">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-surface-600 mx-auto mb-3" />
              <p className="text-surface-500 text-sm">No content generated yet. Create your first post above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {posts.map((post: any) => (
                <div key={post._id}
                  onClick={() => { setSelectedPost(post); loadPostDetail(post._id); }}
                  className={cn(
                    'p-4 rounded-xl border cursor-pointer transition-all',
                    selectedPost?._id === post._id ? 'bg-brand-500/5 border-brand-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-xs text-surface-400 capitalize">
                      {post.contentType?.replace('_', ' ')}
                    </span>
                    <span className={cn('text-xs font-bold', getScoreColor(post.overallScore))}>
                      {post.overallScore}
                    </span>
                  </div>
                  <p className="text-sm text-surface-200 font-medium truncate">{post.title}</p>
                  <p className="text-xs text-surface-500 mt-1 truncate">{post.hook?.substring(0, 80)}...</p>
                  <div className="flex items-center justify-between mt-3 text-xs text-surface-500">
                    <span className="capitalize">{post.status}</span>
                    <span>{post.wordCount} words</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'scores' && postDetail && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-surface-100 mb-4">Quality Scores</h3>
            {postDetail.scores?.map((s: any, i: number) => (
              <div key={i} className="space-y-2">
                {[
                  { label: 'Clarity', value: s.clarity },
                  { label: 'Authenticity', value: s.authenticity },
                  { label: 'Readability', value: s.readability },
                  { label: 'Authority', value: s.authority },
                  { label: 'Uniqueness', value: s.uniqueness },
                  { label: 'Engagement', value: s.engagementPotential },
                ].map(metric => (
                  <div key={metric.label} className="flex items-center justify-between py-1">
                    <span className="text-sm text-surface-400">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-white/[0.05]">
                        <div className={cn('h-full rounded-full', getScoreColor(metric.value))}
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                      <span className={cn('text-xs font-bold w-8 text-right', getScoreColor(metric.value))}>
                        {metric.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-surface-100 mb-4">Review Feedback</h3>
            {postDetail.reviews?.map((r: any, i: number) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={cn('px-2 py-1 rounded-lg text-xs font-bold', r.aiScore > 30 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400')}>
                    AI Score: {r.aiScore}%
                  </div>
                  <div className="text-xs text-surface-500">{r.aiPhraseCount} AI phrases, {r.clicheCount} cliches</div>
                </div>
                {r.issues?.slice(0, 5).map((issue: any, j: number) => (
                  <div key={j} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <p className="text-xs text-surface-400 capitalize font-medium">{issue.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{issue.suggestion}</p>
                  </div>
                ))}
                <p className="text-sm text-surface-400 italic">{r.overallAssessment}</p>
              </div>
            ))}
            {(!postDetail.reviews || postDetail.reviews.length === 0) && (
              <p className="text-sm text-surface-500">No review data available.</p>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'variations' && postDetail && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {postDetail.variations?.length > 0 ? (
            postDetail.variations.map((v: any) => (
              <div key={v._id} className="glass-card rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-xs font-bold">
                      Version {v.version}
                    </span>
                    <span className="text-sm text-surface-400">{v.angle?.substring(0, 80)}</span>
                  </div>
                  <button onClick={() => handleSelectVariation(v._id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-500/20"
                  >
                    <ThumbsUp className="w-3 h-3" /> Select as Best
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-sm text-surface-300 whitespace-pre-line leading-relaxed">
                    {v.fullContent}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="glass-card rounded-2xl p-6 border border-white/5 text-center py-12">
              <Layers className="w-12 h-12 text-surface-600 mx-auto mb-3" />
              <p className="text-surface-500 text-sm">Select a post to view its variations.</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'voice' && postDetail && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-surface-100 mb-4">Voice DNA Match</h3>
            {postDetail.voiceScores?.map((v: any, i: number) => (
              <div key={i} className="space-y-2">
                {[
                  { label: 'Vocabulary', value: v.vocabularyMatch },
                  { label: 'Tone', value: v.toneMatch },
                  { label: 'Storytelling', value: v.storytellingMatch },
                  { label: 'Hook Style', value: v.hookMatch },
                  { label: 'CTA Style', value: v.ctaMatch },
                ].map(metric => (
                  <div key={metric.label} className="flex items-center justify-between py-1">
                    <span className="text-sm text-surface-400">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-white/[0.05]">
                        <div className={cn('h-full rounded-full', getScoreColor(metric.value))}
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                      <span className={cn('text-xs font-bold w-8 text-right', getScoreColor(metric.value))}>
                        {metric.value}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-sm text-surface-300 font-medium">Overall Voice Match</span>
                  <span className={cn('text-sm font-bold', getScoreColor(v.overall))}>{v.overall}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-surface-100 mb-4">Voice Issues</h3>
            {postDetail.voiceScores?.[0]?.issues?.length > 0 ? (
              <div className="space-y-2">
                {postDetail.voiceScores[0].issues.map((issue: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase', issue.severity === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400')}>
                        {issue.severity}
                      </span>
                      <span className="text-xs text-surface-400">{issue.rule}</span>
                    </div>
                    <p className="text-xs text-surface-500">Expected: {issue.expected}</p>
                    <p className="text-xs text-surface-500">Found: {issue.found}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-500">No voice issues detected.</p>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'career' && postDetail && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-surface-100 mb-4">Career Alignment</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className={cn('text-3xl font-bold', getScoreColor(postDetail.post?.careerAlignmentScore || 0))}>
                {postDetail.post?.careerAlignmentScore || '-'}
              </div>
              <div>
                <p className="text-sm text-surface-300">Career Alignment Score</p>
                <p className="text-xs text-surface-500">How well this content supports your career goals</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-surface-100 mb-4">Post Details</h3>
            {postDetail.post && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-surface-400">Type</span><span className="text-surface-200 capitalize">{postDetail.post.contentType?.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between"><span className="text-surface-400">Status</span><span className="text-surface-200 capitalize">{postDetail.post.status}</span></div>
                <div className="flex justify-between"><span className="text-surface-400">Words</span><span className="text-surface-200">{postDetail.post.wordCount}</span></div>
                <div className="flex justify-between"><span className="text-surface-400">Read Time</span><span className="text-surface-200">{postDetail.post.estimatedReadTime} min</span></div>
                <div className="flex justify-between"><span className="text-surface-400">Versions</span><span className="text-surface-200">{postDetail.versions?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-surface-400">Variations</span><span className="text-surface-200">{postDetail.variations?.length || 0}</span></div>
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-surface-300 font-medium">Overall Score</span>
                  <span className={cn('font-bold', getScoreColor(postDetail.post.overallScore))}>{postDetail.post.overallScore}</span>
                </div>
              </div>
            )}
          </div>

          {postDetail.versions && postDetail.versions.length > 0 && (
            <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/5">
              <h3 className="text-sm font-semibold text-surface-100 mb-4">Version History</h3>
              <div className="space-y-2">
                {postDetail.versions.map((v: any) => (
                  <div key={v._id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 text-xs font-bold">
                        v{v.version}
                      </span>
                      <span className="text-sm text-surface-300 capitalize">{v.changeType.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-surface-500">{v.changeDescription || ''}</span>
                    </div>
                    <span className="text-xs text-surface-500">{new Date(v.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {['scores', 'variations', 'voice', 'career'].includes(activeTab) && !postDetail && (
        <div className="glass-card rounded-2xl p-6 border border-white/5 text-center py-16">
          <Eye className="w-12 h-12 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-500 text-sm">Select a post from the Library tab to view details.</p>
        </div>
      )}
    </div>
  );
}
