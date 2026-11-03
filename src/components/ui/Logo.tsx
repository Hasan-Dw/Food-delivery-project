import { cn } from '@/lib/cn';

interface LogoProps {
  tone?: 'dark' | 'light';
  className?: string;
  markOnly?: boolean;
}

/**
 * Savora wordmark: a sun rising over a plate, and an editorial serif wordmark.
 * The mark is drawn inline so it stays crisp and themeable.
 */
export function Logo({ tone = 'dark', className, markOnly = false }: LogoProps) {
  const light = tone === 'light';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 48 48"
        role="img"
        aria-label="Savora"
        className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
      >
        <circle cx="24" cy="24" r="23" fill={light ? '#D6AA70' : '#354638'} />
        <path
          d="M13 30.5c0-7 4.8-13 11-15.8 6.2 2.8 11 8.8 11 15.8"
          stroke={light ? '#354638' : '#D6AA70'}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="24" cy="28.5" r="3.6" fill={light ? '#C65D3B' : '#C65D3B'} />
        <path
          d="M11 33.5h26"
          stroke={light ? '#354638' : '#FBF8F1'}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>

      {!markOnly ? (
        <span
          className={cn(
            'font-display text-[1.65rem] leading-none tracking-[-0.02em] sm:text-[1.8rem]',
            light ? 'text-cream' : 'text-olive-800',
          )}
        >
          savora
          <span className="text-terracotta">.</span>
        </span>
      ) : null}
    </span>
  );
}
