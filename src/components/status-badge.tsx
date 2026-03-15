'use client';

import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-muted-foreground/20',
  suspended: 'bg-warning/10 text-warning border-warning/20',
  banned: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-accent/10 text-accent border-accent/20',
  resolved: 'bg-success/10 text-success border-success/20',
  open: 'bg-info/10 text-info border-info/20',
  closed: 'bg-muted text-muted-foreground border-muted-foreground/20',
  registered: 'bg-success/10 text-success border-success/20',
  lost: 'bg-destructive/10 text-destructive border-destructive/20',
  found: 'bg-info/10 text-info border-info/20',
  discarded: 'bg-muted text-muted-foreground border-muted-foreground/20',
  unregistered: 'bg-muted text-muted-foreground border-muted-foreground/20',
  available: 'bg-success/10 text-success border-success/20',
  deactivated: 'bg-destructive/10 text-destructive border-destructive/20',
  under_review: 'bg-warning/10 text-warning border-warning/20',
  dismissed: 'bg-muted text-muted-foreground border-muted-foreground/20',
  contacted: 'bg-info/10 text-info border-info/20',
  returned: 'bg-success/10 text-success border-success/20',
  kept: 'bg-warning/10 text-warning border-warning/20',
  expired: 'bg-muted text-muted-foreground border-muted-foreground/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  low: 'bg-muted text-muted-foreground border-muted-foreground/20',
  medium: 'bg-accent/10 text-accent border-accent/20',
  high: 'bg-warning/10 text-warning border-warning/20',
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
  none: 'bg-muted text-muted-foreground border-muted-foreground/20',
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = statusStyles[status] || 'bg-muted text-muted-foreground border-muted-foreground/20';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold capitalize border',
        style,
        className
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
