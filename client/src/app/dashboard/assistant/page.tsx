'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  MessageCircle, Send, Sparkles, Lightbulb, Calendar, Target,
  TrendingUp, Zap, CheckCircle2, XCircle, Clock, AlertCircle,
  ThumbsUp, Bookmark, ChevronRight, Bot, User, RefreshCw,
  Trash2, List, BarChart3, Compass,
} from 'lucide-react';

interface Message {
  _id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: string;
  metadata?: any;
  createdAt?: string;
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [proactiveRecs, setProactiveRecs] = useState<any[]>([]);
  const [suggestedTasks, setSuggestedTasks] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'recs' | 'tasks'>('chat');
  const [sessions, setSessions] = useState<any[]>([]);
  const [showSessions, setShowSessions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userId = user?.id || '';

  useEffect(() => {
    if (userId) {
      loadSessions();
      loadProactive();
      loadTasks();
    }
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadSessions() {
    try {
      const data = await api.aiManager.getSessions(userId);
      setSessions(data || []);
      if (data?.length > 0 && !sessionId) {
        setSessionId(data[0]._id);
        loadHistory(data[0]._id);
      }
    } catch { /* ignore */ }
  }

  async function loadHistory(sid: string) {
    try {
      const data = await api.aiManager.getHistory(sid);
      setMessages(data || []);
    } catch { /* ignore */ }
  }

  async function loadProactive() {
    try {
      const data = await api.aiManager.getProactive(userId);
      setProactiveRecs(data || []);
      const recs = await api.aiManager.getRecommendations(userId);
      setRecommendations(recs || []);
    } catch { /* ignore */ }
  }

  async function loadTasks() {
    try {
      const data = await api.aiManager.getTasks(userId);
      setSuggestedTasks(data || []);
    } catch { /* ignore */ }
  }

  async function handleSend() {
    if (!input.trim() || !userId || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    setMessages(prev => [...prev, { role: 'user', content: userMessage, _id: Date.now().toString() }]);

    try {
      const data = await api.aiManager.chat(userId, userMessage, sessionId || undefined);
      setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, _id: Date.now().toString(), metadata: { insights: data.insights, actions: data.actions } }]);

      if (data.recommendations?.length > 0) {
        setRecommendations(prev => [...data.recommendations, ...prev]);
      }
      if (data.suggestedQuestions) {
        setShowSuggestions(true);
      }
      loadProactive();
      loadTasks();
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I encountered an error processing your request. Please try again.', _id: Date.now().toString() }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewSession() {
    try {
      const data = await api.aiManager.createSession(userId);
      setSessionId(data._id);
      setMessages([]);
      setShowSuggestions(true);
      loadSessions();
    } catch { /* ignore */ }
  }

  async function switchSession(sid: string) {
    setSessionId(sid);
    setMessages([]);
    setLoading(true);
    await loadHistory(sid);
    setLoading(false);
    setShowSessions(false);
    setShowSuggestions(false);
  }

  async function handleQuickAction(action: string, params?: any) {
    switch (action) {
      case 'generate_post':
        setInput('I want to create a new post. Can you help me?');
        break;
      case 'regenerate_strategy':
        setInput('Review and regenerate my content strategy.');
        break;
      case 'view_calendar':
        setInput('Show me my content calendar.');
        break;
      case 'mine_opportunities':
        setInput('Find new opportunities for me.');
        break;
      case 'review_analytics':
        setInput('How is my content performing?');
        break;
      case 'update_profile':
        setInput('Review my LinkedIn profile and suggest improvements.');
        break;
      default:
        if (params?.topic) {
          setInput(`Create a post about "${params.topic}"`);
        }
    }
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(dateStr?: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  }

  const suggestedQuestions = [
    'What should I post today?',
    'Review my content strategy',
    'Find new opportunities',
    'How can I build authority?',
    'Analyze my engagement',
  ];

  const quickActions = [
    { label: 'Generate Post', icon: Sparkles, action: 'generate_post' },
    { label: 'Review Strategy', icon: TrendingUp, action: 'regenerate_strategy' },
    { label: 'Find Opportunities', icon: Target, action: 'mine_opportunities' },
    { label: 'Analyze Analytics', icon: BarChart3, action: 'review_analytics' },
    { label: 'Review Profile', icon: Compass, action: 'update_profile' },
  ];

  const activeRecs = recommendations.filter((r: any) => r.status === 'active');

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-4">
      <div className="flex-1 flex flex-col glass-card rounded-2xl border border-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-surface-100">AI Brand Copilot</h2>
              <p className="text-[10px] text-surface-500">Personal Brand Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSessions(!showSessions)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-surface-400 hover:text-surface-200"
            >
              <List className="w-3 h-3 inline mr-1" />Sessions
            </button>
            <button onClick={handleNewSession}
              className="px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-500/20"
            >
              + New Chat
            </button>
          </div>
        </div>

        {/* Sessions Panel */}
        {showSessions && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-b border-white/5 bg-white/[0.01]">
            <div className="p-3 space-y-1 max-h-40 overflow-y-auto">
              {sessions.map((s: any) => (
                <button key={s._id} onClick={() => switchSession(s._id)}
                  className={cn(
                    'w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all',
                    sessionId === s._id ? 'bg-brand-500/10 text-brand-400' : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.03]'
                  )}
                >
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
              <Bot className="w-16 h-16 text-surface-600 mb-4" />
              <h3 className="text-lg font-semibold text-surface-200 mb-2">Your Brand Copilot is Ready</h3>
              <p className="text-sm text-surface-500 max-w-md mb-6">
                I have access to your brand identity, content strategy, career goals, and analytics.
                Ask me anything about your personal brand.
              </p>

              {showSuggestions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                  {suggestedQuestions.map((q, i) => (
                    <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/[0.06] text-left transition-all"
                    >
                      <ChevronRight className="w-3 h-3 flex-shrink-0 text-brand-500" />
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div key={msg._id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={cn(
                'max-w-[80%] rounded-2xl px-5 py-3',
                msg.role === 'user'
                  ? 'bg-brand-500/10 border border-brand-500/20 text-surface-200'
                  : 'bg-white/[0.03] border border-white/5 text-surface-300'
              )}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.metadata?.insights?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                    {msg.metadata.insights.map((insight: string, j: number) => (
                      <div key={j} className="flex items-start gap-2 text-xs text-surface-500">
                        <Lightbulb className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" />
                        {insight}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-surface-600 mt-2">{msg.createdAt ? formatTime(msg.createdAt) : ''}</p>
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
              placeholder="Ask me anything about your personal brand..."
              rows={1}
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-surface-200 placeholder:text-surface-600 resize-none focus:outline-none focus:border-brand-500/30"
            />
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className={cn(
                'px-4 py-3 rounded-xl transition-all flex items-center justify-center',
                input.trim() && !loading ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-white/[0.03] text-surface-600'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-80 flex flex-col gap-4">
        {/* Quick Actions */}
        <div className="glass-card rounded-2xl p-4 border border-white/5">
          <h3 className="text-xs font-semibold text-surface-300 mb-3 uppercase tracking-wider">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((qa, i) => (
              <button key={i} onClick={() => handleQuickAction(qa.action)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
              >
                <qa.icon className="w-4 h-4 text-brand-400" />
                <span className="text-[10px] text-surface-400">{qa.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Recommendations */}
        {activeRecs.length > 0 && (
          <div className="glass-card rounded-2xl p-4 border border-white/5">
            <h3 className="text-xs font-semibold text-surface-300 mb-3 uppercase tracking-wider">
              Recommendations ({activeRecs.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activeRecs.slice(0, 5).map((rec: any, i: number) => (
                <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-surface-300 font-medium">{rec.title}</p>
                      <p className="text-[10px] text-surface-500 mt-0.5">{rec.description?.substring(0, 80)}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-medium uppercase',
                          rec.priority === 'critical' ? 'bg-red-500/10 text-red-400' :
                          rec.priority === 'high' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-surface-500/10 text-surface-400'
                        )}>
                          {rec.priority}
                        </span>
                        {rec.suggestedAction?.type && (
                          <button onClick={() => handleQuickAction(rec.suggestedAction.type, rec.suggestedAction.params)}
                            className="text-[9px] text-brand-400 hover:text-brand-300"
                          >
                            Take Action
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proactive Recommendations */}
        {proactiveRecs.length > 0 && (
          <div className="glass-card rounded-2xl p-4 border border-white/5">
            <h3 className="text-xs font-semibold text-surface-300 mb-3 uppercase tracking-wider">Proactive Insights</h3>
            <div className="space-y-2">
              {proactiveRecs.slice(0, 4).map((rec: any, i: number) => (
                <button key={i} onClick={() => handleQuickAction(rec.action)}
                  className="w-full flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] text-left"
                >
                  <Zap className="w-3 h-3 text-brand-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-surface-300 font-medium">{rec.title}</p>
                    <p className="text-[10px] text-surface-500">{rec.description?.substring(0, 70)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Tasks */}
        {suggestedTasks.length > 0 && (
          <div className="glass-card rounded-2xl p-4 border border-white/5">
            <h3 className="text-xs font-semibold text-surface-300 mb-3 uppercase tracking-wider">Suggested Tasks</h3>
            <div className="space-y-1.5">
              {suggestedTasks.slice(0, 5).map((task: any, i: number) => (
                <button key={i} onClick={() => handleQuickAction(task.action)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] text-left"
                >
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    task.priority === 'critical' ? 'bg-red-500' :
                    task.priority === 'high' ? 'bg-amber-500' :
                    task.priority === 'medium' ? 'bg-brand-500' : 'bg-surface-500'
                  )} />
                  <span className="text-xs text-surface-400">{task.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
