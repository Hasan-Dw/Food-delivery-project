import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type BadgeTone = 'olive' | 'gold' | 'terracotta' | 'cream' | 'outline' | 'success';
type BadgeSize = 'sm' | 'md';

const tones: Record<BadgeTone, string> = {
  olive: 'bg-olive-700 text-cream',
  gold: 'bg-gold-100 text-gold-700 ring-1 ring-inset ring-gold-300/50',
  terracotta: 'bg-terracotta-50 text-terracotta-700 ring-1 ring-inset ring-terracotta-200/60',
  cream: 'bg-cream text-olive-800 ring-1 ring-inset ring-olive-900/10',
  outline: 'border border-olive-900/15 text-olive-700',
  success: 'bg-success/10 text-success ring-1 ring-inset ring-success/20',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'px-2.5 py-1 text-[0.625rem] tracking-[0.1em]',
  md: 'px-3 py-1.5 text-[0.6875rem] tracking-[0.08em]',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
  icon?: ReactNode;
}

export function Badge({ children, tone = 'cream', size = 'sm', className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold uppercase leading-none',
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
