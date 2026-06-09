'use client';

import { motion } from 'framer-motion';
import { cn, formatScore, getScoreColor, getScoreLabel } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  maxScore?: number;
  showLabel?: boolean;
}

export function ScoreGauge({
  score,
  label,
  size = 'md',
  maxScore = 100,
  showLabel = true,
}: ScoreGaugeProps) {
  const percentage = (formatScore(score) / maxScore) * 100;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  const dimensions = {
    sm: { width: 80, strokeWidth: 6, fontSize: 18 },
    md: { width: 120, strokeWidth: 8, fontSize: 28 },
    lg: { width: 160, strokeWidth: 10, fontSize: 36 },
  };

  const { width, strokeWidth, fontSize } = dimensions[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width, height: width }}>
        <svg width={width} height={width} className="transform -rotate-90">
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-surface-800"
          />
          <motion.circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            className={scoreColor}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold tabular-nums"
            style={{ fontSize }}
          >
            {formatScore(score)}
          </span>
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <p className="text-sm font-medium text-surface-300">{label}</p>
          <p className={cn('text-xs font-medium mt-0.5', scoreColor)}>
            {scoreLabel}
          </p>
        </div>
      )}
    </div>
  );
}
