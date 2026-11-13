import { AlertTriangle, FlaskConical, KeyRound, ShieldCheck } from 'lucide-react';
import { env } from '@/config/env';
import { site } from '@/config/site';
import { cn } from '@/lib/cn';

interface AuthModeNoticeProps {
  variant: 'login' | 'register' | 'reset';
  onUsePreview?: () => void;
  className?: string;
}

const previewCopy = {
  login: {
    title: 'Preview sign-in',
    body: 'Credentials are checked in this browser. Nothing is sent to a server.',
  },
  register: {
    title: 'Preview registration',
    body: 'Accounts exist for this browser tab only. Use a made-up password, never a real one.',
  },
  reset: {
    title: 'Preview reset flow',
    body: 'No email is sent and no password changes in preview mode.',
  },
} as const;

const backendCopy = {
  login: {
    title: 'Server-verified sign-in',
    body: 'Your credentials are sent to the Savora API and verified on the server. Passwords are never stored in the browser.',
  },
  register: {
    title: 'Create a Savora account',
    body: 'Customer accounts are active immediately. Restaurant owner and delivery partner accounts need approval before their tools unlock.',
  },
  reset: {
    title: 'Password reset',
    body: 'The Savora API creates a time-limited reset token. Email delivery is not enabled in this environment yet.',
  },
} as const;

/**
 * Explains how the current auth surface behaves. In preview mode it is a
 * disclosure; with the backend enabled it sets expectations about approval and
 * reset delivery without pretending the browser is the source of truth.
 */
export function AuthModeNotice({ variant, onUsePreview, className }: AuthModeNoticeProps) {
  const usingPreview = env.useMocks;
  const content = usingPreview ? previewCopy[variant] : backendCopy[variant];

  return (
    <div
      className={cn(
        'rounded-2xl border border-gold-300/50 bg-gold-50/80 p-4 text-olive-800',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-200/70 text-gold-700">
          {usingPreview ? (
            <FlaskConical aria-hidden="true" className="h-4 w-4" />
          ) : (
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.8125rem] font-semibold leading-snug">
            {content.title}
            <span className="rounded-full bg-olive-700 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-cream">
              {usingPreview ? 'Preview' : 'API'}
            </span>
          </p>
          <p className="mt-1.5 text-[0.75rem] leading-relaxed text-olive-600">{content.body}</p>

          {usingPreview && variant === 'login' ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 font-mono text-[0.6875rem] text-olive-700">
                <KeyRound aria-hidden="true" className="h-3.5 w-3.5 text-terracotta" />
                {site.previewAccount.email} · {site.previewAccount.password}
              </p>
              {onUsePreview ? (
                <button
                  type="button"
                  onClick={onUsePreview}
                  className="self-start rounded-full bg-olive-700 px-3.5 py-1.5 text-[0.6875rem] font-medium text-cream transition hover:bg-olive-800"
                >
                  Fill preview account
                </button>
              ) : null}
            </div>
          ) : null}

          {usingPreview && variant !== 'login' ? (
            <p className="mt-2 flex items-center gap-1.5 text-[0.6875rem] text-olive-500">
              <AlertTriangle aria-hidden="true" className="h-3 w-3 text-gold-600" />
              Preview only · no real security or email delivery.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
