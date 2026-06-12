'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  BarChart3,
  Shield,
  ArrowRight,
  Linkedin,
  Menu,
  X,
  ChevronDown,
  Play,
  Check,
  Star,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  Send,
  Clock,
  Zap,
  Brain,
  Target,
  Globe,
  Download,
  Eye,
  MessageSquare,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Sparkle,
  GitBranch,
  FileUp,
  Settings,
  Layout,
  Pen,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const SectionWrapper = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'AI Writer', href: '#ai-writer' },
  { label: 'Analytics', href: '#analytics' },
  { label: 'Pricing', href: '#pricing' },
];

const features = [
  {
    icon: Linkedin,
    title: 'LinkedIn Analysis',
    description: 'Deep AI analysis of your LinkedIn profile, engagement patterns, and content performance.',
    gradient: 'from-brand-500 to-brand-600',
  },
  {
    icon: Brain,
    title: 'Voice Profile Detection',
    description: 'AI detects your unique professional voice and ensures all content matches your style.',
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    icon: Target,
    title: 'AI Content Strategy',
    description: 'Strategic content recommendations based on your industry, role, and growth goals.',
    gradient: 'from-accent-500 to-accent-600',
  },
  {
    icon: Calendar,
    title: '90-Day Calendar',
    description: 'A complete 3-month content calendar with topics, formats, and optimal posting times.',
    gradient: 'from-amber-500 to-amber-600',
  },
  {
    icon: Pen,
    title: 'AI Content Writer',
    description: 'Generate LinkedIn posts in your voice with hooks, stories, and compelling CTAs.',
    gradient: 'from-rose-500 to-rose-600',
  },
  {
    icon: Send,
    title: 'LinkedIn Auto Publishing',
    description: 'Schedule and auto-publish content directly to LinkedIn at optimal times.',
    gradient: 'from-brand-500 to-accent-500',
  },
  {
    icon: Download,
    title: 'Google Sheets Export',
    description: 'Export your content calendar to Google Sheets for team collaboration.',
    gradient: 'from-green-500 to-green-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track engagement, follower growth, and content performance in real-time.',
    gradient: 'from-cyan-500 to-cyan-600',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'VP Engineering at TechCorp',
    quote: 'PersonaOS completely transformed my LinkedIn presence. I went from posting randomly to having a strategic content plan that generated 3x more engagement in just 6 weeks.',
    avatar: 'SC',
  },
  {
    name: 'Marcus Johnson',
    role: 'Startup Founder',
    quote: 'As a founder, I never had time to write consistent LinkedIn content. PersonaOS\'s AI Writer captures my voice perfectly and the auto-publish feature means I never miss a posting day.',
    avatar: 'MJ',
  },
  {
    name: 'Priya Sharma',
    role: 'Product Manager',
    quote: 'The 90-day calendar and analytics dashboard are game changers. I can see exactly what content resonates with my audience and double down on what works.',
    avatar: 'PS',
  },
];

const faqs = [
  {
    question: 'How does the AI analyze my LinkedIn profile?',
    answer: 'Our AI connects to your LinkedIn profile via OAuth and analyzes your headline, about section, experience, posts, engagement patterns, and follower demographics. It cross-references this with your resume, GitHub, and any other connected data sources to build a complete picture of your professional brand.',
  },
  {
    question: 'Will the AI-generated content sound like me?',
    answer: 'Yes! Our Voice Profile Detection technology learns your writing style from your existing LinkedIn posts and other professional writing. It captures your tone, vocabulary, sentence structure, and content themes. Every piece of content is generated to match your unique voice.',
  },
  {
    question: 'Can I review content before it gets published?',
    answer: 'Absolutely. While PersonaOS supports auto-publishing, you have full control. You can review, edit, or reject any content before it goes live. Many users start with manual approval and switch to auto-publish once they trust the AI\'s output.',
  },
  {
    question: 'What data does PersonaOS access?',
    answer: 'PersonaOS only accesses data you explicitly authorize. We use OAuth for LinkedIn connections and only read your profile data, posts, and engagement metrics. We never post, comment, or send messages without your permission. Your data is encrypted at rest and in transit.',
  },
  {
    question: 'How does the 90-day content calendar work?',
    answer: 'The AI generates a personalized 90-day calendar based on your industry trends, optimal posting times, content mix (thought leadership, storytelling, educational), and your professional goals. Each day includes a topic, format suggestion, and can include a fully written draft.',
  },
  {
    question: 'Is there a free trial available?',
    answer: 'Yes! PersonaOS offers a free tier that includes LinkedIn profile analysis, 5 AI-generated posts per month, and basic analytics. No credit card required. Premium plans unlock unlimited content generation, auto-publishing, and advanced analytics.',
  },
];

const showcaseTabs = [
  { id: 'analysis', label: 'LinkedIn Analysis', icon: Linkedin },
  { id: 'calendar', label: 'Content Calendar', icon: Calendar },
  { id: 'writer', label: 'AI Writer', icon: Pen },
  { id: 'publishing', label: 'Publishing Center', icon: Send },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const howItWorksSteps = [
  { icon: Linkedin, title: 'Connect LinkedIn', description: 'Securely connect your LinkedIn account via OAuth. We only read your profile and posts.' },
  { icon: FileUp, title: 'Upload Resume', description: 'Upload your resume to give AI deeper context about your experience and expertise.' },
  { icon: GitBranch, title: 'Connect GitHub', description: 'Link your GitHub to showcase your technical projects and contributions.' },
  { icon: Brain, title: 'AI Analysis', description: 'Our AI analyzes all your data sources to understand your professional brand.' },
  { icon: Target, title: 'Content Strategy', description: 'Receive a personalized content strategy aligned with your career goals.' },
  { icon: Calendar, title: '90-Day Calendar', description: 'Get a complete 3-month content calendar with topics and formats.' },
  { icon: Pen, title: 'Generate Posts', description: 'AI writes LinkedIn posts in your voice, ready for review or auto-publish.' },
  { icon: Send, title: 'Auto Publish', description: 'Content is automatically published to LinkedIn at optimal times.' },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showcaseTab, setShowcaseTab] = useState('analysis');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left - rect.width / 2) / 25,
      y: (e.clientY - rect.top - rect.height / 2) / 25,
    });
  };

  const counterStats = [
    { value: '2,500+', label: 'Profiles Analyzed' },
    { value: '15,000+', label: 'Posts Generated' },
    { value: '8,500+', label: 'Calendars Created' },
    { value: '500+', label: 'Hours Saved' },
  ];

  return (
    <div className="min-h-screen bg-surface-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] bg-accent-500/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass border-b border-white/5 shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-surface-100">PersonaOS</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-surface-400 hover:text-surface-100 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard" className="btn-primary text-sm">
                Dashboard
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="btn-secondary text-sm">
                  Sign In
                </Link>
                <Link href="/sign-in" className="btn-primary text-sm">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-surface-400 hover:text-surface-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden glass border-t border-white/5"
            >
              <div className="px-6 py-4 flex flex-col gap-3">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm text-surface-400 hover:text-surface-100 transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                  <Link href="/sign-in" className="btn-secondary text-sm w-full justify-center" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                  <Link href="/sign-in" className="btn-primary text-sm w-full justify-center" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center pt-20" ref={heroRef} onMouseMove={handleMouseMove}>
          <div className="max-w-7xl mx-auto px-6 py-20 w-full">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm text-brand-400 mb-8">
                    <Sparkles className="w-4 h-4" />
                    AI LinkedIn Consistency Coach
                  </div>

                  <h1 className="text-5xl md:text-7xl font-bold text-surface-100 leading-tight mb-6">
                    Turn Your LinkedIn Profile Into A{' '}
                    <span className="text-gradient">Content Engine</span>
                  </h1>

                  <p className="text-xl text-surface-400 max-w-lg mb-10 leading-relaxed">
                    Stop guessing what to post. PersonaOS connects your LinkedIn, resume, and GitHub — then builds a complete content strategy powered by AI.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mb-10">
                    {isAuthenticated ? (
                      <Link href="/onboarding" className="btn-primary text-base px-8 py-3.5 gap-2 glow">
                        Continue Onboarding
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    ) : (
                      <>
                        <Link href="/sign-in" className="btn-primary text-base px-8 py-3.5 gap-2 glow">
                          Start Free Analysis
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                        <button className="btn-secondary text-base px-8 py-3.5 gap-2">
                          <Play className="w-5 h-5" />
                          Watch Demo
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {['S', 'M', 'P', 'A', 'J'].map((letter, i) => (
                        <div
                          key={i}
                          className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold border-2 border-surface-950"
                        >
                          {letter}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs text-surface-400">Loved by 2,500+ professionals</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Hero Visual - Dashboard Mockup */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden lg:block"
                style={{
                  transform: `perspective(1000px) rotateY(${mousePos.x * 0.3}deg) rotateX(${-mousePos.y * 0.3}deg)`,
                }}
              >
                <div className="glass rounded-2xl p-6 relative">
                  {/* Profile Analysis Card */}
                  <div className="bg-surface-900/60 rounded-xl p-5 mb-4 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-surface-300">Profile Analysis</span>
                      <span className="badge-success">Excellent</span>
                    </div>
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-bold text-gradient">92</span>
                      <span className="text-lg text-surface-500 mb-1">/100</span>
                    </div>
                    <div className="w-full bg-surface-800 rounded-full h-2 mt-3">
                      <div className="bg-gradient-to-r from-brand-500 to-accent-500 h-2 rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-surface-900/60 rounded-xl p-4 border border-white/5">
                      <p className="text-xs text-surface-400 mb-1">Voice Match</p>
                      <p className="text-xl font-bold text-accent-400">88%</p>
                    </div>
                    <div className="bg-surface-900/60 rounded-xl p-4 border border-white/5">
                      <p className="text-xs text-surface-400 mb-1">Posts Scheduled</p>
                      <p className="text-xl font-bold text-brand-400">24</p>
                    </div>
                    <div className="bg-surface-900/60 rounded-xl p-4 border border-white/5">
                      <p className="text-xs text-surface-400 mb-1">Published Today</p>
                      <p className="text-xl font-bold text-green-400">3</p>
                    </div>
                  </div>

                  <div className="bg-surface-900/60 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-surface-300">Auto-publishing to LinkedIn</span>
                      <span className="text-xs text-accent-400">In Progress</span>
                    </div>
                    <div className="w-full bg-surface-800 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-brand-500 to-accent-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: '68%' }}
                        transition={{ duration: 2, delay: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Floating Notification Cards */}
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-4 -right-4 glass rounded-xl p-3 border border-white/10 shadow-xl"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-surface-200">Post Published</p>
                        <p className="text-[10px] text-surface-500">2 min ago</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    className="absolute -bottom-3 -left-3 glass rounded-xl p-3 border border-white/10 shadow-xl"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-brand-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-surface-200">Engagement +34%</p>
                        <p className="text-[10px] text-surface-500">This week</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Trust Stats */}
        <SectionWrapper>
          <section className="py-16 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {counterStats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-3xl md:text-4xl font-bold text-gradient mb-2">{stat.value}</p>
                    <p className="text-sm text-surface-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </SectionWrapper>

        {/* How It Works */}
        <section id="how-it-works" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionWrapper>
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/20 text-sm text-accent-400 mb-4">
                  <Zap className="w-4 h-4" />
                  How It Works
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-surface-100 mb-4">
                  From Zero to LinkedIn Authority in <span className="text-gradient">8 Steps</span>
                </h2>
                <p className="text-lg text-surface-400 max-w-2xl mx-auto">
                  Our AI-powered workflow transforms your professional data into a winning LinkedIn strategy.
                </p>
              </div>
            </SectionWrapper>

            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-brand-500/50 via-accent-500/50 to-brand-500/50 hidden md:block" />

              {howItWorksSteps.map((step, index) => (
                <SectionWrapper key={step.title}>
                  <div className={`flex items-center gap-8 mb-12 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                      <div className={`inline-block ${index % 2 === 0 ? 'md:ml-auto' : ''}`}>
                        <div className="glass rounded-2xl p-6 max-w-md glass-hover">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <h3 className="text-lg font-semibold text-surface-100">{step.title}</h3>
                          </div>
                          <p className="text-surface-400 text-sm">{step.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex w-12 h-12 rounded-full bg-surface-900 border-2 border-brand-500/50 items-center justify-center z-10">
                      <step.icon className="w-5 h-5 text-brand-400" />
                    </div>

                    <div className="flex-1 hidden md:block" />
                  </div>
                </SectionWrapper>
              ))}
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionWrapper>
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm text-brand-400 mb-4">
                  <Sparkle className="w-4 h-4" />
                  Features
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-surface-100 mb-4">
                  Everything You Need to <span className="text-gradient">Dominate LinkedIn</span>
                </h2>
                <p className="text-lg text-surface-400 max-w-2xl mx-auto">
                  A complete suite of AI-powered tools to analyze, strategize, create, and publish content.
                </p>
              </div>
            </SectionWrapper>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => (
                <SectionWrapper key={feature.title}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className={`glass rounded-2xl p-6 glass-hover group ${
                      index === 0 || index === 5 ? 'md:col-span-2' : ''
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-surface-100 mb-2">{feature.title}</h3>
                    <p className="text-surface-400 text-sm leading-relaxed">{feature.description}</p>
                  </motion.div>
                </SectionWrapper>
              ))}
            </div>
          </div>
        </section>

        {/* Showcase Section */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionWrapper>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold text-surface-100 mb-4">
                  See It In <span className="text-gradient">Action</span>
                </h2>
                <p className="text-lg text-surface-400 max-w-2xl mx-auto">
                  Explore the powerful tools that make PersonaOS the ultimate LinkedIn growth platform.
                </p>
              </div>
            </SectionWrapper>

            <SectionWrapper>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {showcaseTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setShowcaseTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      showcaseTab === tab.id
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25'
                        : 'glass text-surface-400 hover:text-surface-200 glass-hover'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={showcaseTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="glass rounded-2xl p-8"
                >
                  {showcaseTab === 'analysis' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-surface-100">LinkedIn Profile Analysis</h3>
                        <span className="badge-success">Score: 92/100</span>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-surface-900/50 rounded-xl p-4 border border-white/5">
                          <p className="text-sm text-surface-400 mb-1">Headline</p>
                          <p className="text-surface-200 text-sm">VP of Engineering | Building Scalable Systems | Speaker</p>
                          <div className="flex items-center gap-1 mt-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-green-400">Optimized</span>
                          </div>
                        </div>
                        <div className="bg-surface-900/50 rounded-xl p-4 border border-white/5">
                          <p className="text-sm text-surface-400 mb-1">About Section</p>
                          <p className="text-surface-200 text-sm">Strong narrative with clear value proposition</p>
                          <div className="flex items-center gap-1 mt-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-green-400">Strong</span>
                          </div>
                        </div>
                        <div className="bg-surface-900/50 rounded-xl p-4 border border-white/5">
                          <p className="text-sm text-surface-400 mb-1">Engagement Rate</p>
                          <p className="text-surface-200 text-sm">Top 5% in your industry</p>
                          <div className="flex items-center gap-1 mt-2">
                            <TrendingUp className="w-4 h-4 text-accent-400" />
                            <span className="text-xs text-accent-400">Growing</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-surface-900/50 rounded-xl p-4 border border-white/5">
                        <p className="text-sm font-medium text-surface-300 mb-3">AI Recommendations</p>
                        <div className="space-y-2">
                          {['Add a compelling CTA to your about section', 'Post 3-4 times per week for maximum reach', 'Engage with comments within 1 hour of posting'].map((rec, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <ArrowRight className="w-4 h-4 text-brand-400" />
                              <span className="text-sm text-surface-400">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {showcaseTab === 'calendar' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-surface-100">90-Day Content Calendar</h3>
                        <span className="badge-info">Week 1 of 13</span>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <div key={day} className="text-center text-xs text-surface-500 font-medium py-2">
                            {day}
                          </div>
                        ))}
                        {Array.from({ length: 28 }).map((_, i) => (
                          <div
                            key={i}
                            className={`aspect-square rounded-lg border border-white/5 p-1.5 text-xs ${
                              i < 5
                                ? 'bg-brand-500/10 border-brand-500/20'
                                : i === 5
                                ? 'bg-accent-500/10 border-accent-500/20 ring-2 ring-accent-500/30'
                                : 'bg-surface-900/30'
                            }`}
                          >
                            <span className="text-surface-400">{i + 1}</span>
                            {i < 5 && <div className="w-1 h-1 rounded-full bg-brand-400 mt-1" />}
                            {i === 5 && <div className="w-1 h-1 rounded-full bg-accent-400 mt-1" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showcaseTab === 'writer' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-surface-100">AI Content Writer</h3>
                        <span className="badge-success">Voice Match: 88%</span>
                      </div>
                      <div className="bg-surface-900/50 rounded-xl p-6 border border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                            S
                          </div>
                          <div>
                            <p className="text-sm font-medium text-surface-200">Sarah Chen</p>
                            <p className="text-xs text-surface-500">VP Engineering at TechCorp</p>
                          </div>
                        </div>
                        <p className="text-surface-300 text-sm leading-relaxed mb-3">
                          I just shipped a feature that reduced our API latency by 73%. Here&apos;s what I learned about the importance of performance optimization in distributed systems:
                        </p>
                        <p className="text-surface-300 text-sm leading-relaxed mb-3">
                          The biggest mistake teams make is optimizing too late. By the time you have a performance problem, you&apos;ve already lost users.
                        </p>
                        <p className="text-surface-300 text-sm leading-relaxed mb-3">
                          3 things that made the difference:
                        </p>
                        <div className="space-y-1 mb-3">
                          {['Profiling before optimizing', 'Setting up automated performance budgets', 'Building monitoring into the CI pipeline'].map((item, i) => (
                            <p key={i} className="text-surface-300 text-sm">✅ {item}</p>
                          ))}
                        </div>
                        <p className="text-surface-300 text-sm leading-relaxed">
                          What performance wins have you celebrated recently? Drop them below 👇
                        </p>
                      </div>
                    </div>
                  )}

                  {showcaseTab === 'publishing' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-surface-100">Publishing Center</h3>
                        <span className="badge-info">5 Posts Scheduled</span>
                      </div>
                      <div className="space-y-3">
                        {[
                          { time: 'Today, 9:00 AM', status: 'published', title: 'Performance optimization lessons' },
                          { time: 'Today, 2:00 PM', status: 'scheduled', title: 'Team leadership insights' },
                          { time: 'Tomorrow, 9:00 AM', status: 'scheduled', title: 'Technical architecture trends' },
                          { time: 'Wed, 9:00 AM', status: 'draft', title: 'Industry predictions for 2026' },
                        ].map((post, i) => (
                          <div key={i} className="bg-surface-900/50 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                post.status === 'published' ? 'bg-green-400' : post.status === 'scheduled' ? 'bg-brand-400' : 'bg-surface-500'
                              }`} />
                              <div>
                                <p className="text-sm font-medium text-surface-200">{post.title}</p>
                                <p className="text-xs text-surface-500">{post.time}</p>
                              </div>
                            </div>
                            <span className={`badge ${
                              post.status === 'published' ? 'badge-success' : post.status === 'scheduled' ? 'badge-info' : 'badge-warning'
                            }`}>
                              {post.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showcaseTab === 'analytics' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-surface-100">Analytics Dashboard</h3>
                        <span className="badge-success">+34% This Month</span>
                      </div>
                      <div className="grid md:grid-cols-4 gap-4">
                        {[
                          { label: 'Impressions', value: '45.2K', change: '+28%' },
                          { label: 'Engagement', value: '3.8K', change: '+42%' },
                          { label: 'Followers', value: '+847', change: '+19%' },
                          { label: 'Profile Views', value: '1.2K', change: '+35%' },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-surface-900/50 rounded-xl p-4 border border-white/5">
                            <p className="text-xs text-surface-400 mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-surface-100">{stat.value}</p>
                            <p className="text-xs text-green-400 mt-1">{stat.change}</p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-surface-900/50 rounded-xl p-4 border border-white/5">
                        <p className="text-sm font-medium text-surface-300 mb-4">Engagement Over Time</p>
                        <div className="flex items-end gap-1 h-32">
                          {[40, 55, 45, 60, 70, 65, 80, 75, 90, 85, 95, 100].map((height, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-gradient-to-t from-brand-500/50 to-brand-500/20 rounded-t"
                              style={{ height: `${height}%` }}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between mt-2">
                          {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((month, i) => (
                            <span key={i} className="text-[10px] text-surface-500">{month}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </SectionWrapper>
          </div>
        </section>

        {/* Auto Publish Workflow */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionWrapper>
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-sm text-green-400 mb-4">
                  <Send className="w-4 h-4" />
                  Auto Publish
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-surface-100 mb-4">
                  Set It and <span className="text-gradient">Forget It</span>
                </h2>
                <p className="text-lg text-surface-400 max-w-2xl mx-auto">
                  Our automated workflow handles everything from analysis to publishing.
                </p>
              </div>
            </SectionWrapper>

            <SectionWrapper>
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-0">
                {[
                  { icon: Linkedin, label: 'LinkedIn Analysis' },
                  { icon: Brain, label: 'AI Strategy' },
                  { icon: Calendar, label: 'AI Calendar' },
                  { icon: Pen, label: 'AI Posts' },
                  { icon: Clock, label: 'Publishing Queue' },
                  { icon: Send, label: 'Auto Publish' },
                ].map((step, index) => (
                  <div key={step.label} className="flex items-center">
                    <div className="glass rounded-xl p-4 text-center min-w-[120px] glass-hover">
                      <step.icon className="w-6 h-6 text-brand-400 mx-auto mb-2" />
                      <p className="text-xs font-medium text-surface-300">{step.label}</p>
                    </div>
                    {index < 5 && (
                      <div className="hidden md:block w-8 h-px bg-gradient-to-r from-brand-500/50 to-accent-500/50 mx-1" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-8 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-400">Auto-publish progress</span>
                  <span className="text-sm text-accent-400">68%</span>
                </div>
                <div className="w-full bg-surface-800 rounded-full h-3">
                  <motion.div
                    className="bg-gradient-to-r from-brand-500 via-accent-500 to-green-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '68%' }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                    viewport={{ once: true }}
                  />
                </div>
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* AI Writer Section */}
        <section id="ai-writer" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionWrapper>
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400 mb-4">
                    <Pen className="w-4 h-4" />
                    AI Writer
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-surface-100 mb-6">
                    Content That Sounds Like <span className="text-gradient">You</span>
                  </h2>
                  <p className="text-lg text-surface-400 mb-8 leading-relaxed">
                    Our AI learns your unique writing voice and generates LinkedIn posts with compelling hooks, engaging stories, and clear CTAs. Every post feels authentically you.
                  </p>
                  <div className="space-y-4">
                    {['Voice Profile Detection technology', 'Hook → Story → CTA framework', 'Industry-specific topic suggestions', 'Optimal posting time recommendations'].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-accent-400 shrink-0" />
                        <span className="text-surface-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <span className="text-xs text-surface-500 ml-2">AI Writer</span>
                  </div>

                  <div className="bg-surface-900/60 rounded-xl p-5 border border-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="badge-info">Hook</span>
                    </div>
                    <p className="text-surface-200 text-sm mb-4 leading-relaxed">
                      I spent 3 years building distributed systems before I realized the biggest bottleneck wasn&apos;t the code — it was the communication.
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="badge-warning">Story</span>
                    </div>
                    <p className="text-surface-200 text-sm mb-4 leading-relaxed">
                      Last quarter, our team shipped a feature 2 weeks ahead of schedule. The secret? We stopped having daily standups and started writing weekly updates instead.
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="badge-success">CTA</span>
                    </div>
                    <p className="text-surface-200 text-sm leading-relaxed">
                      What communication hacks have transformed your team? Share below 👇
                    </p>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                      <span className="text-xs text-surface-500">Voice Match:</span>
                      <div className="flex-1 bg-surface-800 rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-brand-500 to-accent-500 h-1.5 rounded-full" style={{ width: '88%' }} />
                      </div>
                      <span className="text-xs text-accent-400">88%</span>
                    </div>
                  </div>
                </div>
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <SectionWrapper>
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 mb-4">
                  <Star className="w-4 h-4" />
                  Testimonials
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-surface-100 mb-4">
                  Loved by <span className="text-gradient">Professionals</span>
                </h2>
              </div>
            </SectionWrapper>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial) => (
                <SectionWrapper key={testimonial.name}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="glass rounded-2xl p-8 glass-hover h-full flex flex-col"
                  >
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-surface-300 leading-relaxed mb-6 flex-1">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-200">{testimonial.name}</p>
                        <p className="text-xs text-surface-500">{testimonial.role}</p>
                      </div>
                    </div>
                  </motion.div>
                </SectionWrapper>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="pricing" className="py-24">
          <div className="max-w-3xl mx-auto px-6">
            <SectionWrapper>
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-500/10 border border-surface-500/20 text-sm text-surface-400 mb-4">
                  <MessageSquare className="w-4 h-4" />
                  FAQ
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-surface-100 mb-4">
                  Frequently Asked <span className="text-gradient">Questions</span>
                </h2>
              </div>
            </SectionWrapper>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <SectionWrapper key={faq.question}>
                  <div className="glass rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <span className="text-sm font-medium text-surface-200 pr-4">{faq.question}</span>
                      <motion.div
                        animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-surface-400 shrink-0" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {expandedFaq === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-0">
                            <p className="text-sm text-surface-400 leading-relaxed">{faq.answer}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </SectionWrapper>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6">
            <SectionWrapper>
              <div className="glass rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-accent-500/10" />
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-5xl font-bold text-surface-100 mb-6">
                    Stop Wondering What To Post Next
                  </h2>
                  <p className="text-lg text-surface-400 max-w-2xl mx-auto mb-10">
                    Join 2,500+ professionals who turned LinkedIn from a chore into their biggest growth channel. Start your free analysis today.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {isAuthenticated ? (
                      <Link href="/dashboard" className="btn-primary text-base px-8 py-3.5 gap-2 glow">
                        Go to Dashboard
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    ) : (
                      <>
                        <Link href="/sign-in" className="btn-primary text-base px-8 py-3.5 gap-2 glow">
                          Start Free Analysis
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link href="/sign-in" className="btn-secondary text-base px-8 py-3.5 gap-2">
                          View Pricing
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </SectionWrapper>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-lg font-bold text-surface-100">PersonaOS</span>
              </div>
              <p className="text-sm text-surface-400 mb-4 max-w-xs">
                The AI-powered LinkedIn consistency coach that turns your professional profile into a content engine.
              </p>
              <div className="flex items-center gap-3">
                <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center text-surface-400 hover:text-surface-100 transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center text-surface-400 hover:text-surface-100 transition-colors">
                  <Globe className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-surface-200 mb-4">Company</h4>
              <ul className="space-y-2.5">
                {['About', 'Blog', 'Careers', 'Press'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-surface-400 hover:text-surface-200 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-surface-200 mb-4">Features</h4>
              <ul className="space-y-2.5">
                {['LinkedIn Analysis', 'AI Writer', 'Content Calendar', 'Auto Publish'].map((item) => (
                  <li key={item}>
                    <a href="#features" className="text-sm text-surface-400 hover:text-surface-200 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-surface-200 mb-4">Resources</h4>
              <ul className="space-y-2.5">
                {['Documentation', 'API', 'Status', 'Support'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-surface-400 hover:text-surface-200 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-surface-500">&copy; 2026 PersonaOS. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-surface-500 hover:text-surface-300 transition-colors">Privacy Policy</a>
              <a href="#" className="text-xs text-surface-500 hover:text-surface-300 transition-colors">Terms of Service</a>
              <a href="#" className="text-xs text-surface-500 hover:text-surface-300 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
