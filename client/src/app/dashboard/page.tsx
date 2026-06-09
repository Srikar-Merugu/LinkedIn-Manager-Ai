'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Linkedin,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Target,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { GlassCard, GlassCardHeader } from '@/components/ui/GlassCard';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ConnectLinkedIn } from '@/components/layout/ConnectLinkedIn';
import { api } from '@/lib/api';
import { MotionDiv, StaggerContainer, StaggerItem } from '@/components/ui/MotionDiv';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { isAuthenticated, isLoading: isLoaded } = useAuth();
  const isSignedIn = isAuthenticated;
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const linkedinId = params.get('linkedinId');

    if (token && linkedinId) {
      setConnected(true);
      setSyncing(true);

      const interval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setSyncing(false), 500);
            return 100;
          }
          return prev + 5;
        });
      }, 300);

      window.history.replaceState({}, '', '/dashboard');
      return;
    }

    if (!isLoaded) return;

    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await api.onboarding.getState();
        if (data.state?.connectedSources?.linkedin?.profileId) {
          setConnected(true);
          setLoading(false);
          return;
        }
      } catch {}

      try {
        const userProfile = await api.profile.getByUser();
        if (userProfile?._id) {
          setConnected(true);
        }
      } catch {}

      setLoading(false);
    })();
  }, [isLoaded, isSignedIn]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-4 w-72" />
          </div>
          <div className="skeleton h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <MotionDiv direction="up" className="max-w-md w-full">
          <GlassCard glow className="text-center p-12">
            <GradientBorder animate className="inline-flex mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <Linkedin className="w-10 h-10 text-white" />
              </div>
            </GradientBorder>

            <h1 className="text-2xl font-bold text-surface-100 mb-3">
              Connect Your LinkedIn
            </h1>
            <p className="text-surface-400 mb-8 leading-relaxed">
              Unlock your full LinkedIn intelligence report. We'll analyze your
              profile and generate personalized recommendations.
            </p>

            <ConnectLinkedIn onConnected={() => setConnected(true)} />
          </GlassCard>
        </MotionDiv>
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <Loader2 className="w-24 h-24 text-brand-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-surface-100">
                {syncProgress}%
              </span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-surface-100 mb-3">
            Analyzing Your Profile
          </h2>

          <div className="space-y-3 mb-8">
            {[
              'Importing profile data...',
              'Analyzing experience & skills...',
              'Calculating scores...',
              'Generating recommendations...',
            ].map((step, i) => (
              <div
                key={step}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-all duration-500',
                  syncProgress >= (i + 1) * 25
                    ? 'bg-accent-500/10 text-accent-400'
                    : 'text-surface-500'
                )}
              >
                {syncProgress >= (i + 1) * 25 ? (
                  <CheckCircle2 className="w-4 h-4 text-accent-400" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-surface-600" />
                )}
                {step}
              </div>
            ))}
          </div>

          <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
              animate={{ width: `${syncProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Dashboard</h1>
            <p className="text-surface-400 mt-1">
              Your LinkedIn intelligence overview
            </p>
          </div>
          <button className="btn-secondary gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {[
            { label: 'Profile Score', score: 72, color: 'from-brand-500 to-brand-600' },
            { label: 'Branding', score: 65, color: 'from-accent-500 to-accent-600' },
            { label: 'Visibility', score: 34, color: 'from-amber-500 to-amber-600' },
            { label: 'Opportunity', score: 78, color: 'from-purple-500 to-purple-600' },
            { label: 'Content Readiness', score: 28, color: 'from-rose-500 to-rose-600' },
          ].map((item) => (
            <GlassCard key={item.label} className="text-center p-6" hover>
              <ScoreGauge
                score={item.score}
                label={item.label}
                size="sm"
              />
            </GlassCard>
          ))}
        </div>
      </StaggerItem>

      <StaggerItem>
        <GlassCard>
          <GlassCardHeader
            title="Quick Actions"
            description="Start with these high-impact tasks"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: BarChart3,
                title: 'View Intelligence Report',
                description: 'Full analysis of your profile',
                gradient: 'from-brand-500 to-brand-600',
                href: '/dashboard/intelligence',
              },
              {
                icon: Lightbulb,
                title: 'Review Recommendations',
                description: 'Personalized action items',
                gradient: 'from-accent-500 to-accent-600',
                href: '/dashboard/recommendations',
              },
              {
                icon: Target,
                title: 'Explore Opportunities',
                description: 'Content & growth opportunities',
                gradient: 'from-purple-500 to-purple-600',
                href: '/dashboard/opportunities',
              },
            ].map((action) => (
              <a
                key={action.title}
                href={action.href}
                className="glass rounded-xl p-5 glass-hover group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-surface-100 mb-1">
                  {action.title}
                </h3>
                <p className="text-xs text-surface-500">
                  {action.description}
                </p>
                <ArrowRight className="w-4 h-4 text-surface-500 mt-3 group-hover:text-brand-400 transition-colors" />
              </a>
            ))}
          </div>
        </GlassCard>
      </StaggerItem>
    </StaggerContainer>
  );
}
