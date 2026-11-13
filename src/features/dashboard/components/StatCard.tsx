import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface StatTrend {
  /** Percentage change against the previous equivalent period. */
  value: number | null;
  label?: string;
  /** Set when an increase is undesirable (for example, costs). */
  invert?: boolean;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  trend?: StatTrend;
  className?: string;
}) {
  const toneClasses = {
    default: 'bg-olive-700/8 text-olive-700',
    success: 'bg-success/10 text-success',
    warning: 'bg-gold-100 text-gold-700',
    danger: 'bg-danger/8 text-danger',
  } as const;

  const trendDirection =
    trend?.value === null || trend?.value === undefined
      ? 'none'
      : trend.value > 0
        ? 'up'
        : trend.value < 0
          ? 'down'
          : 'flat';
  const trendPositive =
    trendDirection === 'none' || trendDirection === 'flat'
      ? null
      : trend?.invert
        ? trendDirection === 'down'
        : trendDirection === 'up';
  const TrendIcon = trendDirection === 'up' ? ArrowUpRight : trendDirection === 'down' ? ArrowDownRight : Minus;

  return (
    <div
      className={cn(
        'rounded-2xl border border-olive-900/10 bg-cream p-5 shadow-[0_1px_0_rgba(73,56,46,0.03)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-olive-500">{label}</p>
        {icon ? (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', toneClasses[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-[1.85rem] leading-none text-olive-900">{value}</p>
      {trend ? (
        <p
          className={cn(
            'mt-2 flex items-center gap-1.5 text-[0.6875rem] font-medium',
            trendPositive === null
              ? 'text-olive-500'
              : trendPositive
                ? 'text-success'
                : 'text-danger',
          )}
        >
          <TrendIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {trend.value === null ? (
            <span>No prior period data</span>
          ) : (
            <span>
              {trend.value > 0 ? '+' : ''}
              {trend.value.toFixed(1)}%{' '}
              <span className="font-normal text-olive-500">{trend.label ?? 'vs previous period'}</span>
            </span>
          )}
        </p>
      ) : null}
      {hint ? <p className="mt-2 text-[0.6875rem] leading-relaxed text-olive-500">{hint}</p> : null}
    </div>
  );
}
