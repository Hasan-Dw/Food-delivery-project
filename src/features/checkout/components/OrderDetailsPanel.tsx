import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { CreditCard, MapPin, Store, TicketPercent } from 'lucide-react';
import type { Order, OrderItem } from '@/types';
import { Image } from '@/components/ui/Image';
import { Skeleton } from '@/components/ui/Skeleton';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import { formatCityLine, formatCurrency, formatDay } from '@/lib/format';
import { cn } from '@/lib/cn';

function OrderItemRow({ item }: { item: OrderItem }) {
  const options = item.selectedOptions?.map((option) => option.optionName) ?? [];

  return (
    <li className="flex items-center gap-3">
      <Image
        imageKey={item.imageKey}
        alt={item.name}
        sizes="48px"
        className="h-12 w-12 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-medium text-olive-900">{item.name}</p>
        <p className="mt-0.5 text-[0.6875rem] text-olive-500">
          {item.quantity} × {formatCurrency(item.unitPrice)}
          {options.length ? ` · ${options.join(', ')}` : ''}
        </p>
      </div>
      <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-olive-900">
        {formatCurrency(item.unitPrice * item.quantity)}
      </span>
    </li>
  );
}

function TotalRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'muted' | 'total';
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between text-[0.8125rem]',
        tone === 'total' && 'border-t border-olive-900/10 pt-2.5 font-display text-base text-olive-900',
        tone === 'muted' && 'text-olive-500',
      )}
    >
      <span>{label}</span>
      <span className={cn('tabular-nums', tone === 'total' ? 'font-semibold' : 'font-medium text-olive-800')}>
        {tone === 'muted' && value > 0 ? `−${formatCurrency(value)}` : formatCurrency(value)}
      </span>
    </div>
  );
}

function DetailBlock({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-olive-900/10 bg-white/60 p-4">
      <h3 className="flex items-center gap-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-olive-500">
        <span className="text-olive-400">{icon}</span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Expandable receipt for one order: line items, the server-priced totals,
 * restaurant, delivery address, payment method and the order/delivery status
 * timeline returned by `GET /orders/:id/history`.
 */
export function OrderDetailsPanel({ order }: { order: Order }) {
  const history = useQuery({
    queryKey: queryKeys.orderStatusHistory(order.id),
    queryFn: () => services.orders.getStatusHistory(order.id),
  });

  const { totals } = order;
  const address = order.deliveryAddress;
  const payment = order.paymentMethod;
  const paymentDetail = [
    payment.brand,
    payment.last4 ? `•••• ${payment.last4}` : null,
    payment.expiry ? `Exp ${payment.expiry}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="grid gap-4 border-t border-olive-900/10 pt-4 sm:grid-cols-2 sm:gap-5">
      <div className="space-y-4">
        <DetailBlock
          icon={<Store aria-hidden="true" className="h-3.5 w-3.5" />}
          title="Items"
        >
          <ul className="space-y-3">
            {order.items.map((item) => (
              <OrderItemRow key={item.id} item={item} />
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-olive-900/10 pt-3">
            <TotalRow label="Subtotal" value={totals.subtotal} />
            <TotalRow label="Delivery fee" value={totals.deliveryFee} />
            {totals.serviceFee > 0 ? <TotalRow label="Service fee" value={totals.serviceFee} /> : null}
            {totals.discount > 0 ? <TotalRow label="Discount" value={totals.discount} tone="muted" /> : null}
            {totals.tax > 0 ? <TotalRow label="Tax" value={totals.tax} /> : null}
            <TotalRow label="Total" value={totals.total} tone="total" />
            {order.couponCode ? (
              <p className="flex items-center gap-1.5 pt-1 text-[0.6875rem] text-olive-500">
                <TicketPercent aria-hidden="true" className="h-3 w-3" />
                Coupon {order.couponCode} applied
              </p>
            ) : null}
          </div>
        </DetailBlock>

        <DetailBlock
          icon={<MapPin aria-hidden="true" className="h-3.5 w-3.5" />}
          title="Delivery address"
        >
          <p className="text-[0.8125rem] font-medium text-olive-900">{address.label}</p>
          <address className="mt-1 not-italic text-[0.8125rem] leading-6 text-olive-600">
            {address.line1}
            {address.line2 ? <>, {address.line2}</> : null}
            <br />
            {formatCityLine(address.city, address.state, address.postalCode)}
            <br />
            {address.country}
            {address.instructions ? (
              <>
                <br />
                <span className="text-olive-500">Note: {address.instructions}</span>
              </>
            ) : null}
          </address>
        </DetailBlock>
      </div>

      <div className="space-y-4">
        <DetailBlock
          icon={<Store aria-hidden="true" className="h-3.5 w-3.5" />}
          title="Restaurant"
        >
          <div className="flex items-center gap-3">
            <Image
              imageKey={order.restaurantImageKey}
              alt={order.restaurantName}
              sizes="48px"
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-semibold text-olive-900">
                {order.restaurantName}
              </p>
              <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                Placed {formatDay(order.placedAt)}
              </p>
            </div>
          </div>
        </DetailBlock>

        <DetailBlock
          icon={<CreditCard aria-hidden="true" className="h-3.5 w-3.5" />}
          title="Payment"
        >
          <p className="text-[0.8125rem] font-medium text-olive-900">{payment.label}</p>
          {paymentDetail ? (
            <p className="mt-0.5 text-[0.6875rem] capitalize text-olive-500">{paymentDetail}</p>
          ) : null}
        </DetailBlock>

        <DetailBlock
          icon={<MapPin aria-hidden="true" className="h-3.5 w-3.5" />}
          title="Status timeline"
        >
          {history.isLoading ? (
            <div className="space-y-3" aria-label="Loading status timeline">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : history.isError || !history.data?.length ? (
            <p className="text-[0.8125rem] text-olive-500">Status details are unavailable right now.</p>
          ) : (
            <ol className="space-y-3">
              {history.data.map((event, index) => (
                <li key={`${event.kind}-${event.status}-${index}`} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      event.completed ? 'bg-terracotta-500' : 'border border-olive-900/25 bg-transparent',
                    )}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-[0.8125rem] font-medium',
                        event.completed ? 'text-olive-900' : 'text-olive-400',
                      )}
                    >
                      {event.label}
                    </p>
                    <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-olive-500">
                      {event.description}
                    </p>
                    {event.timestamp ? (
                      <p className="mt-0.5 text-[0.625rem] tabular-nums text-olive-400">
                        {formatDay(event.timestamp)}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </DetailBlock>
      </div>
    </div>
  );
}
