import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function DashboardPanel({
  title,
  eyebrow,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-olive-900/10 bg-cream shadow-[0_1px_0_rgba(73,56,46,0.03)]',
        className,
      )}
    >
      {title || action ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-olive-900/10 px-5 py-4">
          <div>
            {eyebrow ? (
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-terracotta-600">
                {eyebrow}
              </p>
            ) : null}
            {title ? <h2 className="mt-1 font-display text-[1.2rem] leading-tight text-olive-900">{title}</h2> : null}
            {description ? <p className="mt-1 text-[0.75rem] leading-relaxed text-olive-500">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn('px-5 py-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[0.75rem] font-medium transition',
              active
                ? 'bg-olive-700 text-cream shadow-soft'
                : 'bg-cream text-olive-600 ring-1 ring-inset ring-olive-900/10 hover:text-olive-900',
            )}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[0.5625rem] font-semibold',
                  active ? 'bg-cream/15 text-cream' : 'bg-olive-900/6 text-olive-600',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
