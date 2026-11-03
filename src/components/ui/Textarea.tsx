import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id, label, hint, error, className, containerClassName, ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label ? (
        <label htmlFor={fieldId} className="block text-[0.8125rem] font-medium text-olive-800">
          {label}
        </label>
      ) : null}

      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'min-h-[7rem] w-full resize-y rounded-xl border bg-cream px-4 py-3 text-[0.9375rem] leading-relaxed text-ink transition duration-200 placeholder:text-olive-300/90 hover:border-olive-900/25 focus:border-olive-600 focus:outline-none focus:ring-4 focus:ring-olive-600/10',
          error ? 'border-danger/60 focus:border-danger focus:ring-danger/10' : 'border-olive-900/15',
          className,
        )}
        {...props}
      />

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
