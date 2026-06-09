import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number): number {
  return Math.round(score);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-accent-400';
  if (score >= 60) return 'text-brand-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-accent-500/20';
  if (score >= 60) return 'bg-brand-500/20';
  if (score >= 40) return 'bg-amber-500/20';
  return 'bg-red-500/20';
}

export function getScoreBorderColor(score: number): string {
  if (score >= 80) return 'border-accent-500/30';
  if (score >= 60) return 'border-brand-500/30';
  if (score >= 40) return 'border-amber-500/30';
  return 'border-red-500/30';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Critical';
}

export function getImpactColor(impact: 'high' | 'medium' | 'low'): string {
  switch (impact) {
    case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'low': return 'text-accent-400 bg-accent-500/10 border-accent-500/20';
  }
}

export function getPriorityColor(priority: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'critical': return 'text-red-400 bg-red-500/10';
    case 'high': return 'text-amber-400 bg-amber-500/10';
    case 'medium': return 'text-brand-400 bg-brand-500/10';
    case 'low': return 'text-surface-400 bg-surface-500/10';
  }
}

export function getEffortColor(effort: 'low' | 'medium' | 'high'): string {
  switch (effort) {
    case 'low': return 'text-accent-400';
    case 'medium': return 'text-amber-400';
    case 'high': return 'text-red-400';
  }
}
