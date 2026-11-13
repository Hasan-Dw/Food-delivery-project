import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = 'md',
  label = 'Quantity',
  className,
}: QuantityStepperProps) {
  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-olive-900/15 bg-cream',
        className,
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(
          'flex items-center justify-center rounded-full text-olive-700 transition hover:bg-olive-900/5 disabled:opacity-35',
          buttonSize,
        )}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Minus aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <span
        aria-live="polite"
        className={cn(
          'min-w-6 text-center text-sm font-semibold tabular-nums text-olive-900',
          size === 'sm' && 'text-[0.8125rem]',
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(
          'flex items-center justify-center rounded-full text-olive-700 transition hover:bg-olive-900/5 disabled:opacity-35',
          buttonSize,
        )}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Plus aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
