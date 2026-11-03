import { CreditCard, MapPin, ReceiptText } from 'lucide-react';
import type { Order } from '@/types';
import { Image } from '@/components/ui/Image';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatTime } from '@/lib/format';

/** Read-only order receipt, sized for the tracking sidebar. */
export function OrderSummary({ order }: { order: Order }) {
  return (
    <section
      aria-labelledby="summary-heading"
      className="overflow-hidden rounded-panel border border-olive-900/10 bg-cream shadow-[0_1px_0_rgba(73,56,46,0.03)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-olive-900/8 px-5 py-4">
        <div>
          <p className="eyebrow text-terracotta-600">Your order</p>
          <h2 id="summary-heading" className="mt-2 font-display text-[1.25rem] text-olive-900">
            {order.code}
          </h2>
        </div>
        <Badge tone="outline" icon={<ReceiptText className="h-3 w-3" />}>
          {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
        </Badge>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ivory-200">
            <Image imageKey={order.restaurantImageKey} sizes="64px" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[0.875rem] font-semibold text-olive-900">{order.restaurantName}</p>
            <p className="mt-0.5 text-[0.6875rem] text-olive-500">Ordered at {formatTime(order.placedAt)}</p>
          </div>
        </div>

        <ul className="mt-5 divide-y divide-olive-900/8 border-y border-olive-900/8">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ivory-200">
                <Image imageKey={item.imageKey} sizes="48px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-medium leading-snug text-olive-800">
                  <span className="mr-1 text-olive-500">{item.quantity}×</span>
                  {item.name}
                </p>
                {item.selectedOptions?.length ? (
                  <p className="mt-0.5 text-[0.625rem] leading-relaxed text-olive-500">
                    {item.selectedOptions.map((option) => option.optionName).join(' · ')}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-[0.75rem] text-olive-600">
                {formatCurrency(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 text-[0.75rem]">
          <TotalRow label="Subtotal" value={formatCurrency(order.totals.subtotal)} />
          <TotalRow
            label="Delivery"
            value={order.totals.deliveryFee === 0 ? 'Free' : formatCurrency(order.totals.deliveryFee)}
          />
          <TotalRow label="Service fee" value={formatCurrency(order.totals.serviceFee)} />
          {order.totals.discount > 0 ? (
            <TotalRow label="Discount" value={`−${formatCurrency(order.totals.discount)}`} accent />
          ) : null}
          <TotalRow label="Tax" value={formatCurrency(order.totals.tax)} />
          <div className="flex items-center justify-between border-t border-olive-900/10 pt-3 text-[0.9375rem] font-semibold text-olive-900">
            <dt>Total</dt>
            <dd>{formatCurrency(order.totals.total)}</dd>
          </div>
        </dl>

        <div className="mt-5 rounded-xl bg-ivory px-4 py-3">
          <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-olive-500">
            <MapPin aria-hidden="true" className="h-3 w-3 text-terracotta" />
            Delivering to
          </p>
          <address className="mt-1.5 not-italic text-[0.75rem] leading-relaxed text-olive-600">
            <span className="font-medium text-olive-800">{order.deliveryAddress.line1}</span>
            {order.deliveryAddress.line2 ? `, ${order.deliveryAddress.line2}` : ''}
            <span className="block">
              {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}
            </span>
          </address>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-ivory px-4 py-3">
          <span className="flex items-center gap-2 text-[0.75rem] text-olive-600">
            <CreditCard aria-hidden="true" className="h-3.5 w-3.5 text-olive-500" />
            {order.paymentMethod.label}
          </span>
          {order.paymentMethod.isDefault ? <Badge tone="outline">Default</Badge> : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <a href="#support" className="text-[0.75rem] font-medium text-olive-600 underline-offset-4 hover:underline">
            Need help with this order?
          </a>
          <span className="text-[0.625rem] text-olive-500">Demo receipt</span>
        </div>
      </div>
    </section>
  );
}

function TotalRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={accent ? 'text-success' : 'text-olive-500'}>{label}</dt>
      <dd className={accent ? 'font-medium text-success' : 'text-olive-700'}>{value}</dd>
    </div>
  );
}
