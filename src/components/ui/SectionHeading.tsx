import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: 'dark' | 'light';
  align?: 'left' | 'center';
  className?: string;
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  tone = 'dark',
  align = 'left',
  className,
  id,
}: SectionHeadingProps) {
  const darkSurface = tone === 'light'; // light text on a dark surface

  return (
    <div
      className={cn(
        'flex flex-col gap-6 md:flex-row md:items-end md:justify-between',
        align === 'center' && 'md:flex-col md:items-center md:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow ? (
          <p
            className={cn(
              'eyebrow mb-4',
              darkSurface ? 'text-gold-200' : 'text-terracotta-600',
            )}
          >
            {eyebrow}
          </p>
        ) : null}

        <h2
          id={id}
          className={cn(
            'text-display-md',
            darkSurface ? 'text-cream' : 'text-olive-900',
          )}
        >
          {title}
        </h2>

        {description ? (
          <p
            className={cn(
              'mt-4 max-w-xl text-[0.9375rem] leading-relaxed',
              darkSurface ? 'text-cream/65' : 'text-olive-500',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className={cn('shrink-0', align === 'center' && 'mx-auto')}>{action}</div>
      ) : null}
    </div>
  );
}
