import { AlertTriangle, FlaskConical, KeyRound } from 'lucide-react';
import { site } from '@/config/site';
import { cn } from '@/lib/cn';

interface DemoAccountNoticeProps {
  variant: 'login' | 'register' | 'reset';
  onUseDemo?: () => void;
  className?: string;
}

const copy = {
  login: {
    title: 'Demo sign-in, not real authentication',
    body: 'Credentials are compared in the browser for this prototype only. Nothing is sent to a server, and the session is not secure.',
  },
  register: {
    title: 'Demo registration, not a real account',
    body: 'Accounts live in memory for this browser tab. Please use a made-up password — never a real one.',
  },
  reset: {
    title: 'Demo reset flow',
    body: 'No email is sent and no password is changed. The form demonstrates the interface a real backend would power.',
  },
} as const;

/**
 * Honest demo disclosure. This must stay visible on every auth screen: the
 * prototype must never imply that its client-side session is secure.
 */
export function DemoAccountNotice({ variant, onUseDemo, className }: DemoAccountNoticeProps) {
  const content = copy[variant];

  return (
    <div
      className={cn(
        'rounded-2xl border border-gold-300/50 bg-gold-50/80 p-4 text-olive-800',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-200/70 text-gold-700">
          <FlaskConical aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.8125rem] font-semibold leading-snug">
            {content.title}
            <span className="rounded-full bg-olive-700 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-cream">
              Demo
            </span>
          </p>
          <p className="mt-1.5 text-[0.75rem] leading-relaxed text-olive-600">{content.body}</p>

          {variant === 'login' ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 font-mono text-[0.6875rem] text-olive-700">
                <KeyRound aria-hidden="true" className="h-3.5 w-3.5 text-terracotta" />
                {site.demo.email} · {site.demo.password}
              </p>
              {onUseDemo ? (
                <button
                  type="button"
                  onClick={onUseDemo}
                  className="self-start rounded-full bg-olive-700 px-3.5 py-1.5 text-[0.6875rem] font-medium text-cream transition hover:bg-olive-800"
                >
                  Fill demo account
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-[0.6875rem] text-olive-500">
              <AlertTriangle aria-hidden="true" className="h-3 w-3 text-gold-600" />
              Prototype only · no real security or email delivery.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
