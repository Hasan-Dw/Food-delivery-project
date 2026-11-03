import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  options: SelectOption[];
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, hint, error, options, className, containerClassName, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = `${selectId}-hint`;

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label ? (
        <label htmlFor={selectId} className="block text-[0.8125rem] font-medium text-olive-800">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-describedby={hint ? hintId : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-12 w-full appearance-none rounded-xl border bg-cream px-4 pr-10 text-[0.9375rem] text-ink transition duration-200 hover:border-olive-900/25 focus:border-olive-600 focus:outline-none focus:ring-4 focus:ring-olive-600/10',
            error ? 'border-danger/60' : 'border-olive-900/15',
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-olive-500"
        />
      </div>

      {error ? (
        <p className="text-[0.8125rem] text-danger">{error}</p>
      ) : hint ? (
        <p id={hintId} className="text-[0.8125rem] text-olive-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
