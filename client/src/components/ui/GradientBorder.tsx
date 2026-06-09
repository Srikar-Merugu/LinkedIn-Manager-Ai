'use client';

import { cn } from '@/lib/utils';

interface GradientBorderProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export function GradientBorder({
  children,
  className,
  animate = false,
}: GradientBorderProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl',
        'bg-gradient-to-br from-brand-500/30 via-accent-500/30 to-brand-500/30',
        'p-[1px]',
        animate && 'animate-float',
        className
      )}
    >
      <div className="rounded-[calc(1rem-1px)] bg-surface-950 h-full">
        {children}
      </div>
    </div>
  );
}
