import { Banknote, CreditCard, Info } from 'lucide-react';
import type { PaymentMethod } from '@/types';

export const CASH_ON_DELIVERY_ID = 'cash-on-delivery';

export function PaymentMethodSelector({
  methods,
  selectedId,
  onChange,
  error,
  disabled = false,
}: {
  methods: PaymentMethod[];
  selectedId: string;
  onChange: (id: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-olive-900/10 bg-white/70 p-5 shadow-soft sm:p-7">
      <div className="mb-5">
        <p className="eyebrow text-terracotta-700">03 · The easy part</p>
        <h2 className="mt-2 font-display text-[1.65rem] text-olive-900">Payment method</h2>
      </div>
      {methods.length ? (
        <fieldset className="space-y-2.5">
          <legend className="sr-only">Choose a saved payment method</legend>
          {methods.map((method) => (
            <label
              key={method.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                selectedId === method.id
                  ? 'border-olive-700 bg-olive-900/[0.04]'
                  : 'border-olive-900/10 hover:border-olive-900/25'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={selectedId === method.id}
                onChange={() => onChange(method.id)}
                disabled={disabled}
                className="accent-olive-700"
              />
              <CreditCard aria-hidden="true" className="h-4 w-4 text-olive-600" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium capitalize text-olive-900">
                  {method.brand ?? method.type} {method.last4 ? `ending ${method.last4}` : ''}
                </span>
                <span className="mt-0.5 block text-xs text-olive-500">{method.label}</span>
              </span>
              {method.isDefault ? (
                <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-olive-700">
                  Default
                </span>
              ) : null}
            </label>
          ))}
        </fieldset>
      ) : (
        <label
          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
            selectedId === CASH_ON_DELIVERY_ID
              ? 'border-olive-700 bg-olive-900/[0.04]'
              : 'border-olive-900/10 hover:border-olive-900/25'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value={CASH_ON_DELIVERY_ID}
            checked={selectedId === CASH_ON_DELIVERY_ID}
            onChange={() => onChange(CASH_ON_DELIVERY_ID)}
            disabled={disabled}
            className="accent-olive-700"
          />
          <Banknote aria-hidden="true" className="h-4 w-4 text-olive-600" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-olive-900">Cash on delivery</span>
            <span className="mt-0.5 block text-xs text-olive-500">
              No saved card on file. Pay the driver when your order arrives.
            </span>
          </span>
        </label>
      )}
      {error ? <p className="mt-2 text-xs text-danger" role="alert">{error}</p> : null}
      <p className="mt-4 flex gap-2 rounded-xl bg-ivory px-3.5 py-3 text-xs leading-relaxed text-olive-500">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
        No payment gateway is connected yet. No card details are collected or charged.
      </p>
    </section>
  );
}
