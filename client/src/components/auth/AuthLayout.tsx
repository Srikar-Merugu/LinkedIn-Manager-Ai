'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Linkedin, Brain, TrendingUp, Target, Zap, Shield,
  Star, Users, BarChart3, Sparkles, ArrowRight, CheckCircle2
} from 'lucide-react';

/* ─── Aurora Canvas ─────────────────────────────────────────────────── */
function AuroraCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let id: number;
    let t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const orbs = [
      { x: 0.25, y: 0.35, rx: 0.18, ry: 0.12, c: '99,102,241', s: 0.28 },
      { x: 0.65, y: 0.28, rx: 0.22, ry: 0.14, c: '59,130,246', s: 0.18 },
      { x: 0.5,  y: 0.65, rx: 0.2,  ry: 0.16, c: '6,182,212',  s: 0.22 },
      { x: 0.38, y: 0.75, rx: 0.14, ry: 0.1,  c: '168,85,247', s: 0.32 },
      { x: 0.75, y: 0.55, rx: 0.16, ry: 0.12, c: '236,72,153',  s: 0.15 },
    ];
    const draw = () => {
      t += 0.004;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      orbs.forEach(o => {
        const x = canvas.width  * o.x + Math.sin(t * o.s + o.rx) * canvas.width  * o.rx;
        const y = canvas.height * o.y + Math.cos(t * o.s * 0.7 + o.ry) * canvas.height * o.ry;
        const r = Math.min(canvas.width, canvas.height) * 0.4;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0,   `rgba(${o.c}, 0.14)`);
        g.addColorStop(0.4, `rgba(${o.c}, 0.06)`);
        g.addColorStop(1,   `rgba(${o.c}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

/* ─── Floating Feature Cards ─────────────────────────────────────────── */
const features = [
  { icon: Brain,     label: 'Brand DNA Analysis',        sub: 'AI-powered identity mapping',   color: 'from-violet-500/25 to-violet-600/10', border: 'border-violet-500/20', dot: 'bg-violet-400' },
  { icon: Linkedin,  label: 'LinkedIn Intelligence',     sub: 'Deep profile optimization',     color: 'from-blue-500/25 to-blue-600/10',   border: 'border-blue-500/20',   dot: 'bg-blue-400' },
  { icon: TrendingUp,label: 'Voice DNA Generation',      sub: 'Unique tone & style profile',   color: 'from-cyan-500/25 to-cyan-600/10',   border: 'border-cyan-500/20',   dot: 'bg-cyan-400' },
  { icon: Target,    label: 'Content Strategy',          sub: 'AI-crafted content roadmap',    color: 'from-emerald-500/25 to-emerald-600/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  { icon: Zap,       label: 'Opportunity Detection',     sub: 'Discover growth moments',       color: 'from-amber-500/25 to-amber-600/10', border: 'border-amber-500/20',  dot: 'bg-amber-400' },
  { icon: BarChart3, label: 'Analytics Intelligence',   sub: 'Track brand performance',       color: 'from-pink-500/25 to-pink-600/10',   border: 'border-pink-500/20',   dot: 'bg-pink-400' },
];

function FloatingFeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: [0, 1, 1, 0], y: [30, 0, 0, -15], scale: [0.95, 1, 1, 0.97] }}
      transition={{ duration: 12, delay: index * 1.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.08, 0.92, 1] }}
      className="absolute w-full"
    >
      <div className={`relative rounded-2xl border backdrop-blur-xl p-4 bg-gradient-to-br ${feature.color} ${feature.border}`}
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center border ${feature.border}`}>
            <feature.icon className="w-4 h-4 text-white/80" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white/90">{feature.label}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${feature.dot} animate-pulse`} />
            </div>
            <p className="text-xs text-white/40 mt-0.5">{feature.sub}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20" />
        </div>
        <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${feature.color.replace('/25', '').replace('/10', '')}`}
            initial={{ width: '0%' }}
            animate={{ width: ['0%', '85%', '85%', '0%'] }}
            transition={{ duration: 10, delay: index * 1.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.9, 1] }}
            style={{ filter: 'brightness(1.5)' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Animated Counter ───────────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(Math.floor(start));
      if (start >= target) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{val.toLocaleString()}{suffix}</span>;
}

/* ─── Social Proof Ticker ────────────────────────────────────────────── */
const proofs = [
  { name: 'Sarah Chen', role: 'VP Marketing @ Stripe', text: 'Landed 3 board roles in 6 weeks', avatar: 'SC' },
  { name: 'Marcus Williams', role: 'Staff Engineer @ Linear', text: '40K LinkedIn followers in 3 months', avatar: 'MW' },
  { name: 'Priya Sharma', role: 'Founder @ YC S23', text: 'Closed $2M seed from content alone', avatar: 'PS' },
];

function SocialProofTicker() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % proofs.length), 4000);
    return () => clearInterval(t);
  }, []);
  const p = proofs[current];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={current}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500/40 to-accent-500/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {p.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/80">{p.name}</p>
          <p className="text-[11px] text-white/40 truncate">{p.role}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-[11px] text-accent-400 font-medium">{p.text}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Left Panel ─────────────────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-1 relative flex-col overflow-hidden" style={{ background: '#060812' }}>
      <AuroraCanvas />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }} />

      {/* Subtle grid */}
      <div className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

      <div className="relative z-10 flex flex-col h-full px-12 py-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">PersonaOS</span>
          <div className="ml-2 px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04]">
            <span className="text-[10px] text-white/40 font-medium tracking-wider uppercase">Beta</span>
          </div>
        </div>

        {/* Main Copy */}
        <div className="mt-auto mb-8">
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-7"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            <span className="text-xs text-white/50 font-medium tracking-wide">AI-Powered Personal Branding OS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.1]"
          >
            <span className="text-white/90">Build Your</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Personal Brand
            </span>
            <br />
            <span className="text-white/90">on Autopilot</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-5 text-base text-white/40 leading-relaxed max-w-sm"
          >
            Connect your professional identity and let AI build your
            growth system — content, strategy, opportunities, all automated.
          </motion.p>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex items-center gap-8"
          >
            {[
              { value: 12500, suffix: '+', label: 'Professionals' },
              { value: 94, suffix: '%', label: 'Brand Growth' },
              { value: 3, suffix: 'x', label: 'Faster Results' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs text-white/30 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating cards section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative h-[90px] mb-8"
        >
          {features.map((f, i) => (
            <FloatingFeatureCard key={f.label} feature={f} index={i} />
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex -space-x-1.5">
              {['SC', 'MW', 'PS', 'AR'].map((a, i) => (
                <div key={a} className="w-6 h-6 rounded-full border border-surface-950 bg-gradient-to-br from-brand-500/60 to-accent-500/60 flex items-center justify-center text-[8px] font-bold text-white">
                  {a}
                </div>
              ))}
            </div>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
            </div>
            <span className="text-xs text-white/30">Trusted by 12,500+ professionals</span>
          </div>
          <SocialProofTicker />
        </motion.div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 pt-6 border-t border-white/[0.05] flex flex-wrap gap-x-5 gap-y-2"
        >
          {[
            { icon: Shield, text: 'Enterprise Security' },
            { icon: CheckCircle2, text: 'SOC 2 Ready' },
            { icon: Users, text: 'Powered by Clerk' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="w-3 h-3 text-white/20" />
              <span className="text-[11px] text-white/25">{text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Main Layout ────────────────────────────────────────────────────── */
interface AuthLayoutProps {
  children: React.ReactNode;
  mode?: 'signup' | 'signin';
}

export function AuthLayout({ children, mode = 'signup' }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen overflow-hidden" style={{ background: '#060812' }}>
      <LeftPanel />

      {/* Right panel — form area */}
      <div className="flex-1 lg:flex-none lg:w-[520px] xl:w-[560px] relative flex flex-col overflow-y-auto">
        {/* Subtle separator */}
        <div className="hidden lg:block absolute left-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 px-6 pt-8 pb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">PersonaOS</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-[420px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
