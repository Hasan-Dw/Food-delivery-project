import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StarDisplayProps {
  value: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  label?: string;
}

const displaySizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
} as const;

/** Read-only star row; the numeric score stays available to screen readers. */
export function StarDisplay({ value, size = 'sm', className, label }: StarDisplayProps) {
  const filled = Math.round(value);
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={label ?? `${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((score) => (
        <Star
          key={score}
          aria-hidden="true"
          className={cn(
            displaySizes[size],
            score <= filled ? 'fill-gold-300 text-gold-500' : 'fill-transparent text-olive-300',
          )}
        />
      ))}
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

/** Keyboard-accessible 1–5 star picker used by every review form. */
export function StarInput({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  error,
  hint,
  className,
}: StarInputProps) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <fieldset className={cn('min-w-0', className)} disabled={disabled}>
      <legend className="text-[0.8125rem] font-medium text-olive-800">
        {label}
        {required ? <span className="ml-0.5 text-terracotta-600">*</span> : null}
      </legend>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-label={label}
          aria-required={required || undefined}
          className="flex items-center gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={value === score}
              aria-label={`${score} out of 5`}
              disabled={disabled}
              onMouseEnter={() => setHovered(score)}
              onFocus={() => setHovered(score)}
              onBlur={() => setHovered(0)}
              onClick={() => onChange(score)}
              className="rounded-md p-0.5 transition focus-visible:outline-offset-2 disabled:cursor-not-allowed"
            >
              <Star
                aria-hidden="true"
                className={cn(
                  'h-7 w-7 transition-colors',
                  score <= active ? 'fill-gold-300 text-gold-500' : 'fill-transparent text-olive-300',
                )}
              />
            </button>
          ))}
        </div>
        <span className="text-[0.6875rem] tabular-nums text-olive-500" aria-live="polite">
          {value ? `${value} / 5` : 'Select a rating'}
        </span>
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-[0.75rem] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.75rem] text-olive-500">{hint}</p>
      ) : null}
    </fieldset>
  );
}
