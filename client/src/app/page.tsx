'use client';

import { motion } from 'framer-motion';
import { Sparkles, BarChart3, Shield, ArrowRight, Linkedin } from 'lucide-react';
import Link from 'next/link';
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs';

export default function LandingPage() {
  const { isSignedIn, user } = useUser();
  const features = [
    {
      icon: BarChart3,
      title: 'AI-Powered Brand Analysis',
      description: 'Comprehensive analysis of your professional identity across LinkedIn, resume, GitHub, and portfolio.',
      gradient: 'from-brand-500 to-brand-600',
    },
    {
      icon: Sparkles,
      title: 'Personalized Content Strategy',
      description: 'Automatic content recommendations, opportunity detection, and growth strategies tailored to you.',
      gradient: 'from-accent-500 to-accent-600',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your data is encrypted end-to-end. We never post or interact without your explicit permission.',
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-surface-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(45,212,191,0.1),transparent_50%)]" />

      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-surface-100">PersonaOS</span>
          </div>

          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <Link href="/dashboard" className="btn-primary text-sm">
                Dashboard
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="btn-secondary text-sm">Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="btn-primary text-sm">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </button>
                </SignUpButton>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm text-brand-400 mb-8">
                <Sparkles className="w-4 h-4" />
                AI Personal Branding Operating System
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-surface-100 leading-tight mb-6">
                Your Professional Identity
                <br />
                <span className="text-gradient">Analyzed by AI</span>
              </h1>

              <p className="text-xl text-surface-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                Stop guessing what to post. PersonaOS connects your LinkedIn, resume, GitHub, and portfolio —
                then builds a complete personal brand strategy powered by AI.
              </p>

              <div className="flex items-center justify-center gap-4">
                {isSignedIn ? (
                  <Link href="/onboarding" className="btn-primary text-base px-8 py-3.5 gap-2 glow">
                    Continue Onboarding
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <SignUpButton mode="modal">
                    <button className="btn-primary text-base px-8 py-3.5 gap-2 glow">
                      Start Your Brand Strategy
                      <Sparkles className="w-5 h-5" />
                    </button>
                  </SignUpButton>
                )}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass rounded-2xl p-8 glass-hover group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-surface-100 mb-3">
                  {feature.title}
                </h3>
                <p className="text-surface-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </motion.div>
        </section>
      </main>
    </div>
  );
}
