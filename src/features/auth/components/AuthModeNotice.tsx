import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

interface AuthModeNoticeProps {
  variant: 'login' | 'register' | 'reset';
  className?: string;
}

const backendCopy = {
  login: {
    title: 'Server-verified sign-in',
    body: 'Your credentials are sent to the Savora API and verified on the server. Passwords are never stored in the browser.',
  },
  register: {
    title: 'Real account registration',
    body: 'New accounts are created on the Savora API. Owner and driver accounts need an administrator approval before the workspace unlocks.',
  },
  reset: {
    title: 'Server-handled reset',
    body: 'Reset requests go to the Savora API. The response is always generic so it never reveals which email addresses exist.',
  },
} as const;

/**
 * Sets expectations about approval and reset delivery without pretending the
 * browser is the source of truth.
 */
export function AuthModeNotice({ variant, className }: AuthModeNoticeProps) {
  const content = backendCopy[variant];

  return (
    <div
      className={cn(
        'rounded-2xl border border-gold-300/50 bg-gold-50/80 p-4 text-olive-800',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-200/70 text-gold-700">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.8125rem] font-semibold leading-snug">
            {content.title}
            <span className="rounded-full bg-olive-700 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-cream">
              API
            </span>
          </p>
          <p className="mt-1.5 text-[0.75rem] leading-relaxed text-olive-600">{content.body}</p>
        </div>
      </div>
    </div>
  );
}
