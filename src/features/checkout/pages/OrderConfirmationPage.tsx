import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Check, Clock3, MapPin } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Skeleton';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import { formatCurrency, formatDeliveryWindow } from '@/lib/format';
import { getErrorMessage } from '@/services/api/errors';
import { ROUTES } from '@/config/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function OrderConfirmationPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const order = useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => services.orders.getById(orderId),
    enabled: Boolean(orderId),
  });
  const restaurant = useQuery({
    queryKey: order.data ? queryKeys.restaurant(order.data.restaurantId) : ['restaurants', 'confirmation'],
    queryFn: () => services.restaurants.getById(order.data!.restaurantId),
    enabled: Boolean(order.data),
  });

  useDocumentTitle(order.data ? `Order ${order.data.code} confirmed` : 'Order confirmation');

  if (order.isLoading) return <PageLoader label="Confirming your order…" />;

  if (order.isError || !order.data) {
    return (
      <div className="shell py-16 sm:py-24">
        <h1 className="font-display text-display-sm text-olive-900">We couldn’t load your confirmation</h1>
        <p className="mt-3 max-w-lg text-sm leading-7 text-olive-600">
          {getErrorMessage(order.error, 'Your order may have been placed. Check your order tracking link or try again.')}
        </p>
        <ButtonLink className="mt-6" to={ROUTES.home}>Continue shopping</ButtonLink>
      </div>
    );
  }

  const currentOrder = order.data;
  const window = restaurant.data?.estimatedDeliveryMinutes;

  return (
    <div className="shell max-w-4xl py-10 sm:py-16">
      <section className="overflow-hidden rounded-[1.75rem] border border-olive-900/10 bg-white/75 shadow-soft">
        <div className="bg-olive-800 px-6 py-10 text-center text-cream sm:px-12 sm:py-14">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-300 text-olive-900">
            <Check aria-hidden="true" className="h-7 w-7" />
          </span>
          <p className="mt-5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-gold-300">Order received</p>
          <h1 className="mt-3 font-display text-display-sm">Thank you, we’ve got it.</h1>
          <p className="mt-3 text-sm text-cream/70">
            {currentOrder.restaurantName} has received your order and will review it shortly.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-cream/20 px-4 py-2 text-xs text-cream/80">
            <span className="h-2 w-2 rounded-full bg-gold-300" />
            Order status · {currentOrder.status}
          </p>
        </div>

        <div className="grid gap-8 p-5 sm:p-9 md:grid-cols-[1fr_0.82fr]">
          <div>
            <div className="flex items-start justify-between gap-4 border-b border-olive-900/10 pb-5">
              <div>
                <p className="eyebrow text-terracotta-700">Your receipt</p>
                <h2 className="mt-2 font-display text-[1.55rem] text-olive-900">{currentOrder.code}</h2>
              </div>
              <span className="rounded-full bg-olive-900/[0.05] px-3 py-1.5 text-xs font-medium text-olive-700">
                Pending
              </span>
            </div>
            <ul className="divide-y divide-olive-900/10">
              {currentOrder.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-4 text-sm">
                  <span className="text-olive-700">
                    <span className="mr-2 font-semibold text-olive-900">{item.quantity}×</span>
                    {item.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-olive-900">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-olive-900/10 pt-4 text-sm font-semibold text-olive-900">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(currentOrder.totals.total)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-ivory p-5">
              <div className="flex gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                <div>
                  <h3 className="text-sm font-semibold text-olive-900">Delivering to</h3>
                  <p className="mt-1 text-xs leading-5 text-olive-600">
                    {currentOrder.deliveryAddress.line1}
                    {currentOrder.deliveryAddress.line2 ? `, ${currentOrder.deliveryAddress.line2}` : ''}
                    <br />
                    {currentOrder.deliveryAddress.city}, {currentOrder.deliveryAddress.state}{' '}
                    {currentOrder.deliveryAddress.postalCode}
                  </p>
                  {currentOrder.deliveryAddress.instructions ? (
                    <p className="mt-2 text-xs italic text-olive-500">{currentOrder.deliveryAddress.instructions}</p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-ivory p-5">
              <div className="flex gap-3">
                <Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                <div>
                  <h3 className="text-sm font-semibold text-olive-900">Estimated delivery</h3>
                  <p className="mt-1 text-xs text-olive-600">
                    {window ? formatDeliveryWindow(window) : 'The restaurant will confirm the timing shortly.'}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs leading-5 text-olive-500">
              This order is pending restaurant confirmation; it is not marked complete. Delivery assignment happens separately.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-olive-900/10 p-5 sm:flex-row sm:justify-end sm:p-7">
          <ButtonLink to={ROUTES.home} variant="outline">Continue shopping</ButtonLink>
          <ButtonLink to={ROUTES.orderTracking(currentOrder.id)} iconRight={<ArrowRight className="h-4 w-4" />}>
            Track order
          </ButtonLink>
        </div>
      </section>
      <p className="mt-5 text-center text-xs text-olive-500">
        Questions about this order?{' '}
        <Link to={ROUTES.profile} className="font-medium text-olive-700 underline-offset-4 hover:underline">
          Visit your profile
        </Link>
        .
      </p>
    </div>
  );
}
