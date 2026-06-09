'use client';

import { motion } from 'framer-motion';
import {
  Briefcase,
  GraduationCap,
  Award,
  FolderGit2,
  Activity,
  CalendarDays,
  Building2,
  Target,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { cn } from '@/lib/utils';

interface ProfileSummaryProps {
  profile: {
    firstName: string;
    lastName: string;
    headline?: string;
    profilePicture?: string;
    summary: {
      totalExperienceYears: number;
      totalSkills: number;
      totalCertifications: number;
      totalProjects: number;
      totalActivities: number;
      careerStabilityScore: number;
      profileType: string;
      careerStage: string;
      industry: string;
    };
  };
}

export function ProfileSummary({ profile }: ProfileSummaryProps) {
  const stats = [
    {
      label: 'Experience',
      value: `${profile.summary.totalExperienceYears} yrs`,
      icon: Briefcase,
      color: 'text-brand-400 bg-brand-500/10',
    },
    {
      label: 'Skills',
      value: profile.summary.totalSkills,
      icon: Award,
      color: 'text-accent-400 bg-accent-500/10',
    },
    {
      label: 'Certifications',
      value: profile.summary.totalCertifications,
      icon: GraduationCap,
      color: 'text-amber-400 bg-amber-500/10',
    },
    {
      label: 'Projects',
      value: profile.summary.totalProjects,
      icon: FolderGit2,
      color: 'text-purple-400 bg-purple-500/10',
    },
    {
      label: 'Activity',
      value: profile.summary.totalActivities,
      icon: Activity,
      color: 'text-rose-400 bg-rose-500/10',
    },
    {
      label: 'Stability',
      value: `${profile.summary.careerStabilityScore}%`,
      icon: CalendarDays,
      color: profile.summary.careerStabilityScore >= 70
        ? 'text-accent-400 bg-accent-500/10'
        : 'text-amber-400 bg-amber-500/10',
    },
  ];

  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-start gap-6 mb-8">
        <GradientBorder animate>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-2xl font-bold text-white">
            {profile.firstName[0]}{profile.lastName[0]}
          </div>
        </GradientBorder>

        <div className="flex-1">
          <h2 className="text-2xl font-bold text-surface-100">
            {profile.firstName} {profile.lastName}
          </h2>
          <p className="text-surface-400 mt-1">{profile.headline}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className="badge-info text-xs">{profile.summary.profileType}</span>
            <span className="badge-info text-xs">{profile.summary.careerStage}</span>
            {profile.summary.industry && (
              <span className="flex items-center gap-1.5 text-xs text-surface-500">
                <Building2 className="w-3.5 h-3.5" />
                {profile.summary.industry}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="glass rounded-xl p-4 text-center glass-hover"
            >
              <div className={cn('inline-flex p-2 rounded-lg mb-3', stat.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-surface-100">{stat.value}</p>
              <p className="text-xs text-surface-500 mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}
