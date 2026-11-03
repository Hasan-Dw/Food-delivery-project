import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, hint, error, leading, trailing, className, containerClassName, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label ? (
        <label htmlFor={inputId} className="block text-[0.8125rem] font-medium text-olive-800">
          {label}
        </label>
      ) : null}

      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-olive-500">
            {leading}
          </span>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-12 w-full rounded-xl border bg-cream px-4 text-[0.9375rem] text-ink shadow-[inset_0_1px_1px_rgba(73,56,46,0.03)] transition duration-200 placeholder:text-olive-300/90 hover:border-olive-900/25 focus:border-olive-600 focus:outline-none focus:ring-4 focus:ring-olive-600/10 disabled:cursor-not-allowed disabled:bg-ivory-200 disabled:text-olive-500',
            error ? 'border-danger/60 focus:border-danger focus:ring-danger/10' : 'border-olive-900/15',
            leading && 'pl-10',
            trailing && 'pr-12',
            className,
          )}
          {...props}
        />

        {trailing ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-[0.8125rem] leading-snug text-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[0.8125rem] leading-snug text-olive-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
