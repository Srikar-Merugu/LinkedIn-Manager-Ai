'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
  delay?: number;
}

export function GlassCard({ children, className, glow, hover, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        'glass rounded-2xl p-6',
        glow && 'glow',
        hover && 'glass-hover cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function GlassCardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div>
        <h3 className="text-lg font-semibold text-surface-100">{title}</h3>
        {description && (
          <p className="text-sm text-surface-400 mt-1">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
