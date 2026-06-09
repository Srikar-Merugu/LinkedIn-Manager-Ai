'use client';

import { AuroraBackground } from './AuroraBackground';
import { ParticleField } from './ParticleField';
import { FloatingCards } from './FloatingCards';

const stats = [
  { value: '12,000+', label: 'Professionals' },
  { value: '3.2M+', label: 'Content Impressions' },
  { value: '150K+', label: 'AI Suggestions' },
];

interface AuthLayoutProps {
  title?: string;
  badge?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthLayout({
  title = 'Welcome to PersonaOS',
  badge = 'AI-Powered Growth Platform',
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#050816] overflow-hidden">
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden">
        <AuroraBackground />
        <ParticleField />

        <div className="relative z-10 w-full max-w-2xl mx-auto px-12 py-16">
          <div className="absolute top-8 left-12">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <span className="text-xs font-bold text-white">P</span>
              </div>
              <span className="text-sm font-semibold text-white/80 tracking-tight">PersonaOS</span>
            </div>
          </div>

          <div className="mt-32">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
              <span className="text-[11px] text-white/40 font-medium tracking-wide">AI Operating System</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              <span className="text-white/90">Build Your</span>
              <br />
              <span className="bg-gradient-to-r from-brand-400 via-accent-400 to-brand-300 bg-clip-text text-transparent">
                Personal Brand
              </span>
              <br />
              <span className="text-white/90">on Autopilot</span>
            </h1>

            <p className="mt-4 text-base text-white/40 leading-relaxed max-w-md">
              The AI Operating System for LinkedIn Growth. Analyze your profile, build your brand DNA, generate content, find opportunities.
            </p>

            <div className="mt-8 flex flex-wrap gap-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-xl font-bold text-white/80 tracking-tight">{stat.value}</div>
                  <div className="text-xs text-white/30 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16">
            <FloatingCards />
          </div>
        </div>
      </div>

      <div className="flex-1 lg:flex-none lg:w-[480px] relative flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none" />

        <div className="relative w-full max-w-[420px]">
          <div
            className="relative rounded-2xl p-8 border backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
              borderColor: 'rgba(255,255,255,0.06)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 80px rgba(99,102,241,0.06)',
            }}
          >
            <div className="lg:hidden flex items-center gap-2 mb-8">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">P</span>
              </div>
              <span className="text-sm font-semibold text-white/80">PersonaOS</span>
            </div>

            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.02] mb-4">
              <span className="w-1 h-1 rounded-full bg-accent-400 animate-pulse" />
              <span className="text-[10px] text-white/40 font-medium tracking-wide">{badge}</span>
            </div>

            <h2 className="text-2xl font-bold text-white/90 tracking-tight">{title}</h2>
            <p className="text-sm text-white/40 mt-1 mb-8">
              Start building opportunities with AI.
            </p>

            {children}
          </div>

          <div className="mt-6 text-center">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
