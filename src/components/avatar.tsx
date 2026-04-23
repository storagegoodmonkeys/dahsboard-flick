'use client';

import { cn, getInitials, hashHue } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  seed?: string | null;
  size?: number;
  className?: string;
  onClick?: () => void;
  ring?: boolean;
}

export function Avatar({
  src,
  name,
  seed,
  size = 40,
  className,
  onClick,
  ring = false,
}: AvatarProps) {
  const initials = getInitials(name);
  const hue = hashHue(seed || name || 'x');
  const gradient = `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 35) % 360}, 65%, 40%))`;
  const style: React.CSSProperties = { width: size, height: size };

  const commonClasses = cn(
    'rounded-full flex items-center justify-center shrink-0 overflow-hidden select-none',
    ring && 'ring-2 ring-accent/40 ring-offset-2 ring-offset-card',
    onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
    className,
  );

  if (src) {
    return (
      <div className={commonClasses} style={style} onClick={onClick}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name || ''} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={commonClasses}
      style={{ ...style, background: gradient }}
      onClick={onClick}
    >
      <span
        className="font-bold text-white drop-shadow-sm"
        style={{ fontSize: Math.max(11, size * 0.38) }}
      >
        {initials}
      </span>
    </div>
  );
}
