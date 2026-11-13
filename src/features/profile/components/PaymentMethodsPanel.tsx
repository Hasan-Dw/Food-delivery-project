import { CreditCard, Info, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { PaymentMethod } from '@/types';
import { SectionFrame } from './PersonalInfoForm';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

/**
 * Read-only payment overview. Card management belongs to the checkout module,
 * so this page never pretends to add or charge a card.
 */
export function PaymentMethodsPanel({
  methods,
  isLoading,
  isError = false,
  onRetry,
}: {
  methods: PaymentMethod[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  return (
    <section id="payments" aria-labelledby="payments-heading" className="scroll-mt-28">
      <SectionFrame
        id="payments"
        eyebrow="Ready for checkout"
        title="Payment methods"
        description="Saved methods for the checkout experience. Card management itself lives with the cart & order module."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ivory px-3 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-olive-500">
            <LockKeyhole aria-hidden="true" className="h-3 w-3" />
            Read-only
          </span>
        }
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-2xl bg-olive-900/5" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-5 text-[0.8125rem] text-danger">
            <p className="font-medium">We could not load your saved payment methods.</p>
            {onRetry ? (
              <button type="button" onClick={onRetry} className="mt-2 underline underline-offset-4">
                Try again
              </button>
            ) : null}
          </div>
        ) : methods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-olive-900/15 bg-ivory/60 px-6 py-10 text-center">
            <CreditCard aria-hidden="true" className="mx-auto h-6 w-6 text-olive-300" />
            <p className="mt-3 font-display text-[1.25rem] text-olive-900">No saved methods yet</p>
            <p className="mt-1 text-[0.8125rem] text-olive-500">
              Cards are added during checkout, which is owned by Team Member 2.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {methods.map((method) => (
              <article
                key={method.id}
                className={cn(
                  'relative overflow-hidden rounded-2xl p-5',
                  method.isDefault
                    ? 'bg-olive-800 text-cream shadow-soft'
                    : 'border border-olive-900/10 bg-ivory/60 text-olive-900',
                )}
              >
                <div
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border',
                    method.isDefault ? 'border-cream/10' : 'border-olive-900/5',
                  )}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CreditCard
                      aria-hidden="true"
                      className={cn('h-4 w-4', method.isDefault ? 'text-gold-300' : 'text-olive-500')}
                    />
                    <span className="text-[0.8125rem] font-semibold capitalize">{method.brand ?? method.type}</span>
                  </div>
                  {method.isDefault ? <Badge tone="gold">Default</Badge> : null}
                </div>

                <p className="relative mt-6 font-mono text-[0.9375rem] tracking-[0.18em]">
                  •••• •••• •••• {method.last4 ?? '0000'}
                </p>
                <div className="relative mt-4 flex items-end justify-between gap-3 text-[0.6875rem]">
                  <span className={method.isDefault ? 'text-cream/55' : 'text-olive-500'}>{method.label}</span>
                  <span className={method.isDefault ? 'text-cream/55' : 'text-olive-500'}>
                    Expires {method.expiry ?? '—'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 rounded-xl border border-olive-900/10 bg-ivory px-4 py-3 text-[0.75rem] leading-relaxed text-olive-500 sm:flex-row sm:items-start">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
          <p>
            Payment details are illustrative and never charged. Adding or removing cards is part of the checkout module
            owned by Team Member 2.
          </p>
        </div>

        <p className="mt-4 flex items-center gap-2 text-[0.6875rem] text-olive-500">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          Prototype only — no card data is stored or transmitted.
        </p>
      </SectionFrame>
    </section>
  );
}
