'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Bot, User, Send, ChevronDown, ChevronRight, Sparkles, Target,
  Flame, TrendingUp, Lightbulb, Zap, Award, Code, FileText,
  Clock, Loader2, AlertTriangle, CheckCircle2, Plus, List,
} from 'lucide-react';

interface Message {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface UserContext {
  profile: {
    name: string; headline: string; location: string; about: string;
    skills: string[]; certifications: any[]; projects: any[];
    experience: any[]; education: any[];
    githubUsername: string; githubLanguages: string[]; githubRepos: number;
  } | null;
  scores: any;
  strengths: any[];
  weaknesses: any[];
  contentPillars: any[];
  brandDNA: any;
  writingDNA: any;
  careerBlueprint: any;
  strategy90Days: any;
  careerGoals: string[];
  profileScore: number;
  contentOpportunities: any[];
  posts: { total: number; published: number; scheduled: number; drafts: number; recentPosts: any[] };
  queue: { total: number; items: any[] };
  challenge: any;
}

function SidebarSection({ title, icon: Icon, expanded, onToggle, count, children }: {
  title: string; icon: any; expanded: boolean; onToggle: () => void; count?: number; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-white/5 last:border-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-xs font-medium text-surface-200">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400">{count}</span>
          )}
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="w-3.5 h-3.5 text-surface-500" />
        </motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TagList({ items, max = 8 }: { items: string[]; max?: number }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? items : items.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map((item, i) => (
        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/5 text-surface-400">
          {item}
        </span>
      ))}
      {items.length > max && (
        <button onClick={() => setShowAll(!showAll)} className="text-[10px] text-brand-400 hover:text-brand-300">
          {showAll ? 'Show less' : `+${items.length - max}`}
        </button>
      )}
    </div>
  );
}

export default function AICoachPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [context, setContext] = useState<UserContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    profile: true, pillars: false, strategy: false, challenge: false, strengths: false, posts: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userId = user?.id || '';

  const loadContext = useCallback(async () => {
    if (!userId) return;
    setContextLoading(true);
    setContextError(null);
    try {
      const data = await api.aiCoach.getContext();
      setContext(data);
    } catch (err) {
      setContextError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setContextLoading(false);
    }
  }, [userId]);

  const loadSessions = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await api.aiCoach.getSessions();
      setSessions(data || []);
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => { loadContext(); loadSessions(); }, [loadContext, loadSessions]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userMessage, _id: Date.now().toString() }]);

    try {
      const data = await api.aiCoach.chat(userMessage, sessionId || undefined);
      setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, _id: (Date.now() + 1).toString() }]);
    } catch (error: any) {
      const errorContent = error.message || 'Failed to get response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${errorContent}`, _id: (Date.now() + 1).toString() }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewSession() {
    try {
      const data = await api.aiCoach.createSession();
      setSessionId(data._id);
      setMessages([]);
      loadSessions();
    } catch { /* ignore */ }
  }

  async function switchSession(sid: string) {
    setSessionId(sid);
    setLoading(true);
    try {
      const history = await api.aiCoach.getHistory(sid);
      setMessages(history || []);
    } catch { /* ignore */ }
    setLoading(false);
    setShowSessions(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function togglePanel(s: string) {
    setExpandedPanels(prev => ({ ...prev, [s]: !prev[s] }));
  }

  const suggestedQuestions = [
    'What should I post today?',
    'Give me content ideas based on my projects',
    'Review my content strategy',
    'How can I grow faster on LinkedIn?',
    'Rewrite one of my recent posts',
    'What are my biggest content gaps?',
  ];

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-4">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col glass-card rounded-2xl border border-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-surface-100">AI Content Coach</h2>
              <p className="text-[10px] text-surface-500">
                {context?.profile?.name ? `Personalized for ${context.profile.name}` : 'Loading your profile...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSessions(!showSessions)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-surface-400 hover:text-surface-200 transition-colors">
              <List className="w-3 h-3 inline mr-1" />Sessions
            </button>
            <button onClick={handleNewSession}
              className="px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-500/20 transition-colors">
              + New
            </button>
          </div>
        </div>

        {/* Sessions dropdown */}
        {showSessions && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            className="border-b border-white/5 bg-white/[0.01]">
            <div className="p-3 space-y-1 max-h-40 overflow-y-auto">
              {sessions.map((s: any) => (
                <button key={s._id} onClick={() => switchSession(s._id)}
                  className={cn('w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all',
                    sessionId === s._id ? 'bg-brand-500/10 text-brand-400' : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.03]')}>
                  <span className="truncate max-w-[200px]">{s.title}</span>
                  <span className="text-surface-600">{s.messageCount} msgs</span>
                </button>
              ))}
              {sessions.length === 0 && <p className="text-xs text-surface-500 text-center py-2">No previous sessions</p>}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 border border-brand-500/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-200 mb-1">
                {context?.profile?.name ? `Welcome, ${context.profile.name.split(' ')[0]}` : 'Your AI Coach is Ready'}
              </h3>
              <p className="text-sm text-surface-500 max-w-md mb-6">
                I have access to your complete profile, projects, skills, content strategy, and analytics.
                Every response is personalized to your career and content goals.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {suggestedQuestions.map((q, i) => (
                  <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/[0.06] text-left transition-all">
                    <ChevronRight className="w-3 h-3 flex-shrink-0 text-brand-500" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div key={msg._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={cn('max-w-[80%] rounded-2xl px-5 py-3',
                msg.role === 'user'
                  ? 'bg-brand-500/10 border border-brand-500/20 text-surface-200'
                  : 'bg-white/[0.03] border border-white/5 text-surface-300')}>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content.split('\n').map((line, j) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={j} className="font-semibold text-surface-200 mt-2 first:mt-0">{line.replace(/\*\*/g, '')}</p>;
                    }
                    if (line.startsWith('- ') || line.startsWith('• ')) {
                      return <p key={j} className="ml-3 text-surface-400">{line}</p>;
                    }
                    return <p key={j} className={j > 0 ? 'mt-1.5' : ''}>{line}</p>;
                  })}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-surface-400" />
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-500/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-brand-500/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-brand-500/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/5">
          <div className="flex gap-3">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your LinkedIn content..."
              rows={1}
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-surface-200 placeholder:text-surface-600 resize-none focus:outline-none focus:border-brand-500/30 transition-colors" />
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className={cn('px-4 py-3 rounded-xl transition-all flex items-center justify-center',
                input.trim() && !loading ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-white/[0.03] text-surface-600')}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar — AI Memory Panel */}
      <div className="w-80 flex flex-col gap-0 glass-card rounded-2xl border border-white/5 overflow-hidden overflow-y-auto">
        {contextLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          </div>
        ) : contextError ? (
          <div className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-xs text-surface-400">{contextError}</p>
          </div>
        ) : context ? (
          <>
            {/* Profile Overview */}
            <SidebarSection title="Your Profile" icon={User} expanded={expandedPanels.profile} onToggle={() => togglePanel('profile')}>
              {context.profile && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-surface-200">{context.profile.name}</p>
                  <p className="text-[10px] text-surface-500 leading-relaxed">{context.profile.headline}</p>
                  {context.profile.location && (
                    <p className="text-[10px] text-surface-600">{context.profile.location}</p>
                  )}
                  {context.profile.skills.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-surface-600 mb-1">Skills</p>
                      <TagList items={context.profile.skills} max={6} />
                    </div>
                  )}
                  {context.profile.projects.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-surface-600 mb-1">Projects</p>
                      <TagList items={context.profile.projects.map((p: any) => typeof p === 'string' ? p : p.name || p.title || 'Project')} max={4} />
                    </div>
                  )}
                  {context.profile.certifications.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-surface-600 mb-1">Certifications</p>
                      <TagList items={context.profile.certifications.map((c: any) => typeof c === 'string' ? c : c.name || c.title || 'Cert')} max={4} />
                    </div>
                  )}
                  {context.profile.githubUsername && (
                    <div className="flex items-center gap-2 text-[10px] text-surface-500">
                      <Code className="w-3 h-3" />
                      <span>{context.profile.githubUsername} — {context.profile.githubRepos} repos</span>
                    </div>
                  )}
                </div>
              )}
            </SidebarSection>

            {/* Content Pillars */}
            {context.contentPillars.length > 0 && (
              <SidebarSection title="Content Pillars" icon={Target} expanded={expandedPanels.pillars} onToggle={() => togglePanel('pillars')}
                count={context.contentPillars.length}>
                <div className="space-y-2">
                  {context.contentPillars.map((p: any, i: number) => (
                    <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-xs font-medium text-surface-200">{p.name}</p>
                      <p className="text-[10px] text-surface-500 mt-0.5 line-clamp-2">{p.description}</p>
                    </div>
                  ))}
                </div>
              </SidebarSection>
            )}

            {/* Strategy */}
            {context.strategy90Days && (
              <SidebarSection title="90-Day Strategy" icon={TrendingUp} expanded={expandedPanels.strategy} onToggle={() => togglePanel('strategy')}>
                <div className="space-y-2">
                  <p className="text-[10px] text-surface-400 line-clamp-3">{context.strategy90Days.narrative}</p>
                  {context.strategy90Days.monthlyPlans?.map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <span className="text-brand-400 font-medium">M{m.month}</span>
                      <span className="text-surface-500">{m.phase}: {m.focus}</span>
                    </div>
                  ))}
                  {context.strategy90Days.growthGoals?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[9px] uppercase tracking-wider text-surface-600 mb-1">Goals</p>
                      {context.strategy90Days.growthGoals.map((g: any, i: number) => (
                        <p key={i} className="text-[10px] text-surface-500">{g.goal} — {g.target} {g.metric}</p>
                      ))}
                    </div>
                  )}
                </div>
              </SidebarSection>
            )}

            {/* Challenge Progress */}
            {context.challenge && (
              <SidebarSection title="Challenge Progress" icon={Flame} expanded={expandedPanels.challenge} onToggle={() => togglePanel('challenge')}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full',
                      context.challenge.status === 'active' ? 'bg-green-500/10 text-green-400' :
                      context.challenge.status === 'paused' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-surface-800 text-surface-500')}>
                      {context.challenge.status}
                    </span>
                    <span className="text-[10px] text-surface-400">
                      Day {context.challenge.currentDay || 0}/{context.challenge.totalDays || 90}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${((context.challenge.currentDay || 0) / (context.challenge.totalDays || 90)) * 100}%` }}
                      transition={{ duration: 1 }} />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-1.5 rounded bg-white/[0.02]">
                      <p className="text-xs font-bold text-surface-100">{context.challenge.stats?.postsGenerated || 0}</p>
                      <p className="text-[8px] text-surface-600">Generated</p>
                    </div>
                    <div className="p-1.5 rounded bg-white/[0.02]">
                      <p className="text-xs font-bold text-green-400">{context.challenge.stats?.postsPublished || 0}</p>
                      <p className="text-[8px] text-surface-600">Published</p>
                    </div>
                    <div className="p-1.5 rounded bg-white/[0.02]">
                      <p className="text-xs font-bold text-amber-400">{context.challenge.stats?.currentStreak || 0}d</p>
                      <p className="text-[8px] text-surface-600">Streak</p>
                    </div>
                  </div>
                </div>
              </SidebarSection>
            )}

            {/* Strengths */}
            {context.strengths.length > 0 && (
              <SidebarSection title="Your Strengths" icon={Award} expanded={expandedPanels.strengths} onToggle={() => togglePanel('strengths')}
                count={context.strengths.length}>
                <div className="space-y-1.5">
                  {context.strengths.slice(0, 5).map((s: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-medium text-surface-300">{s.title}</p>
                        <p className="text-[9px] text-surface-600">{s.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SidebarSection>
            )}

            {/* Recent Posts */}
            {context.posts.recentPosts.length > 0 && (
              <SidebarSection title="Recent Posts" icon={FileText} expanded={expandedPanels.posts} onToggle={() => togglePanel('posts')}
                count={context.posts.total}>
                <div className="space-y-1.5">
                  {context.posts.recentPosts.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <div className={cn('w-1.5 h-1.5 rounded-full',
                        p.status === 'published' ? 'bg-green-500' :
                        p.status === 'scheduled' ? 'bg-purple-500' :
                        p.status === 'draft' ? 'bg-amber-500' : 'bg-surface-500')} />
                      <span className="text-surface-400 truncate flex-1">{p.title || 'Untitled'}</span>
                      <span className="text-surface-600">{p.contentType}</span>
                    </div>
                  ))}
                </div>
              </SidebarSection>
            )}

            {/* Quick Stats */}
            <div className="p-4 border-t border-white/5">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                  <p className="text-sm font-bold text-brand-400">{context.profileScore || 0}</p>
                  <p className="text-[8px] text-surface-600">Profile Score</p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                  <p className="text-sm font-bold text-green-400">{context.posts.published}</p>
                  <p className="text-[8px] text-surface-600">Posts Published</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 text-center">
            <p className="text-xs text-surface-500">Complete onboarding to unlock AI coaching</p>
          </div>
        )}
      </div>
    </div>
  );
}
