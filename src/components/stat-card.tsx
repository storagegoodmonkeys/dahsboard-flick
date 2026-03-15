'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color?: 'accent' | 'success' | 'info' | 'destructive' | 'warning';
  loading?: boolean;
}

const colorMap = {
  accent: {
    bg: 'bg-accent/8',
    text: 'text-accent',
    glow: 'shadow-[0_0_15px_rgba(253,216,53,0.08)]',
    border: 'border-accent/10',
  },
  success: {
    bg: 'bg-success/8',
    text: 'text-success',
    glow: 'shadow-[0_0_15px_rgba(0,201,80,0.08)]',
    border: 'border-success/10',
  },
  info: {
    bg: 'bg-info/8',
    text: 'text-info',
    glow: 'shadow-[0_0_15px_rgba(0,217,255,0.08)]',
    border: 'border-info/10',
  },
  destructive: {
    bg: 'bg-destructive/8',
    text: 'text-destructive',
    glow: 'shadow-[0_0_15px_rgba(251,44,54,0.08)]',
    border: 'border-destructive/10',
  },
  warning: {
    bg: 'bg-warning/8',
    text: 'text-warning',
    glow: 'shadow-[0_0_15px_rgba(255,107,53,0.08)]',
    border: 'border-warning/10',
  },
};

export function StatCard({
  title,
  value,
  change,
  changeLabel = 'vs last week',
  icon: Icon,
  color = 'accent',
  loading = false,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className={cn(
      'bg-card rounded-2xl border border-border p-5 hover:bg-card-hover transition-all duration-300 group card-shine',
      colors.glow
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full',
              change > 0 && 'text-success bg-success/10',
              change < 0 && 'text-destructive bg-destructive/10',
              change === 0 && 'text-muted-foreground bg-muted'
            )}
          >
            {change > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : change < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-[28px] font-bold text-foreground tracking-tight mb-1">
        {loading ? (
          <span className="inline-block w-20 h-8 bg-muted rounded-lg animate-pulse" />
        ) : (
          value
        )}
      </p>
      <p className="text-xs text-muted-foreground font-medium">
        {title}
        {change !== undefined && changeLabel && (
          <span className="ml-1.5 opacity-50">{changeLabel}</span>
        )}
      </p>
    </div>
  );
}
