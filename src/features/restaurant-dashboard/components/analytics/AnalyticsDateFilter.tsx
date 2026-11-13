import type { AnalyticsRange } from '@/types';
import { ANALYTICS_RANGE_LABELS } from '@/lib/analytics';
import { cn } from '@/lib/cn';

const ranges: AnalyticsRange[] = ['7d', '30d', '12m'];

/**
 * Range switcher for the analytics charts. Kept as a radio group so keyboard
 * users can tab to it and arrow between options.
 */
export function AnalyticsDateFilter({
  value,
  onChange,
  disabled = false,
}: {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Analytics date range"
      className="inline-flex rounded-full bg-olive-900/[0.05] p-1"
    >
      {ranges.map((range) => {
        const active = range === value;
        return (
          <button
            key={range}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(range)}
            className={cn(
              'rounded-full px-3 py-1.5 text-[0.75rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/60 disabled:cursor-not-allowed disabled:opacity-60',
              active
                ? 'bg-cream text-olive-900 shadow-soft'
                : 'text-olive-600 hover:text-olive-900',
            )}
          >
            {ANALYTICS_RANGE_LABELS[range]}
          </button>
        );
      })}
    </div>
  );
}
