'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn, formatEnum } from '@/lib/utils';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned';

interface Props {
  value: UserStatus | string;
  onChange: (status: UserStatus) => void;
  disabled?: boolean;
}

const STYLES: Record<UserStatus, { text: string; bg: string; dot: string; border: string }> = {
  active:    { text: 'text-success',     bg: 'bg-success/10',     dot: 'bg-success',     border: 'border-success/20' },
  inactive:  { text: 'text-muted-foreground', bg: 'bg-muted',          dot: 'bg-muted-foreground', border: 'border-border' },
  suspended: { text: 'text-warning',     bg: 'bg-warning/10',     dot: 'bg-warning',     border: 'border-warning/20' },
  banned:    { text: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive', border: 'border-destructive/20' },
};

const OPTIONS: UserStatus[] = ['active', 'inactive', 'suspended', 'banned'];

export function UserStatusPill({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = (OPTIONS as string[]).includes(value) ? (value as UserStatus) : 'active';
  const s = STYLES[current];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-2 pl-2.5 pr-2 py-1 rounded-full text-xs font-semibold border transition-colors',
          s.text, s.bg, s.border,
          !disabled && 'hover:brightness-125 cursor-pointer',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
        {formatEnum(current)}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-20 w-36 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {OPTIONS.map((opt) => {
            const os = STYLES[opt];
            const selected = opt === current;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left hover:bg-muted transition-colors',
                  os.text,
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', os.dot)} />
                <span className="flex-1">{formatEnum(opt)}</span>
                {selected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
