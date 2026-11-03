import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
  containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, containerClassName, id, ...props },
  ref,
) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <label
      htmlFor={checkboxId}
      className={cn('group flex cursor-pointer items-start gap-3 select-none', containerClassName)}
    >
      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className={cn(
            'peer h-5 w-5 appearance-none rounded-[5px] border border-olive-900/25 bg-cream transition-colors duration-200 checked:border-olive-700 checked:bg-olive-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta',
            className,
          )}
          {...props}
        />
        <Check
          aria-hidden="true"
          className="pointer-events-none absolute h-3.5 w-3.5 text-cream opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>

      <span className="min-w-0">
        <span className="block text-sm leading-snug text-olive-800">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-olive-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
});
