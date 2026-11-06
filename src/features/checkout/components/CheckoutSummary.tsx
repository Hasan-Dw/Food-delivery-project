import { ArrowRight, LoaderCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export function CheckoutSummary({
  subtotal,
  deliveryFee,
  serviceFee,
  discount,
  tax,
  total,
  disabled,
  isSubmitting,
}: {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  tax: number;
  total: number;
  disabled: boolean;
  isSubmitting: boolean;
}) {
  const rows = [
    { label: 'Subtotal', value: subtotal },
    { label: 'Delivery', value: deliveryFee },
    { label: 'Service fee', value: serviceFee },
    ...(discount > 0 ? [{ label: 'Discount', value: -discount }] : []),
    ...(tax > 0 ? [{ label: 'Tax', value: tax }] : []),
  ];

  return (
    <section className="rounded-2xl border border-olive-900/10 bg-white/75 p-5 shadow-soft sm:p-6">
      <h2 className="font-display text-[1.5rem] text-olive-900">Your order</h2>
      <dl className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 text-sm">
            <dt className="text-olive-600">{row.label}</dt>
            <dd className="tabular-nums text-olive-800">{formatCurrency(row.value)}</dd>
          </div>
        ))}
      </dl>
      <div className="my-5 border-t border-olive-900/10" />
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-semibold text-olive-900">Total</span>
        <span className="font-display text-[1.8rem] leading-none tabular-nums text-olive-900">
          {formatCurrency(total)}
        </span>
      </div>
      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-terracotta-600 px-5 py-3 text-sm font-semibold text-cream shadow-soft transition hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isSubmitting ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? 'Placing your order…' : 'Place order'}
        {!isSubmitting ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
      </button>
      <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-olive-500">
        Your order will be sent to the restaurant as soon as it is placed.
      </p>
    </section>
  );
}
