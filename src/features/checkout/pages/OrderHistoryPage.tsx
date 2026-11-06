import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, Clock3, PackageCheck, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { ButtonLink } from '@/components/ui/Button';
import { Image } from '@/components/ui/Image';
import { PageLoader } from '@/components/ui/Skeleton';
import { ROUTES } from '@/config/routes';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatDay } from '@/lib/format';
import { getErrorMessage } from '@/services/api/errors';
import { services } from '@/services';
import type { Order, OrderStatus } from '@/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type OrderFilter = 'all' | 'active' | 'delivered' | 'cancelled';
const PAGE_SIZE = 6;

const filterLabels: Record<OrderFilter, string> = {
  all: 'All orders',
  active: 'In progress',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  PREPARING: 'Preparing',
  READY: 'Ready for pickup',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function isCancelled(order: Order): boolean {
  return order.status === 'CANCELLED' || order.status === 'REJECTED';
}

function isDelivered(order: Order): boolean {
  return order.status === 'COMPLETED';
}

function matchesFilter(order: Order, filter: OrderFilter): boolean {
  if (filter === 'active') return !isCancelled(order) && !isDelivered(order);
  if (filter === 'delivered') return isDelivered(order);
  if (filter === 'cancelled') return isCancelled(order);
  return true;
}

function OrderCard({ order }: { order: Order }) {
  const cancelled = isCancelled(order);
  const delivered = isDelivered(order);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-olive-900/10 bg-white/75 p-4 shadow-soft transition hover:border-olive-900/20 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <Image
        imageKey={order.restaurantImageKey}
        alt={order.restaurantName}
        className="h-20 w-full shrink-0 rounded-xl object-cover sm:h-[4.5rem] sm:w-[4.5rem]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[1.25rem] text-olive-900">{order.restaurantName}</h3>
          <span
            className={`rounded-full px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide ${
              delivered
                ? 'bg-olive-900/[0.07] text-olive-700'
                : cancelled
                  ? 'bg-danger/10 text-danger'
                  : 'bg-gold-100 text-olive-700'
            }`}
          >
            {statusLabels[order.status]}
          </span>
        </div>
        <p className="mt-1 text-xs text-olive-600">
          {order.items.map((item) => item.name).join(' · ')}
        </p>
        <p className="mt-2 text-[0.6875rem] text-olive-400">
          {formatDay(order.placedAt)} <span aria-hidden="true">·</span> Order {order.code}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-olive-900/10 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <span className="text-sm font-semibold tabular-nums text-olive-900">
          {formatCurrency(order.totals.total)}
        </span>
        <Link
          to={ROUTES.orderTracking(order.id)}
          className="inline-flex items-center gap-1.5 rounded-full border border-olive-900/15 px-3 py-2 text-xs font-medium text-olive-700 transition hover:border-olive-900/30 hover:bg-olive-900/[0.04]"
        >
          {delivered || cancelled ? <ReceiptText aria-hidden="true" className="h-3.5 w-3.5" /> : <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />}
          {delivered || cancelled ? 'Receipt' : 'Track order'}
        </Link>
      </div>
    </article>
  );
}

export default function OrderHistoryPage() {
  const { user, isAuthenticated } = useAuth();
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [page, setPage] = useState(1);

  const orders = useQuery({
    queryKey: queryKeys.orderList({ customerId: user?.id }),
    queryFn: () => services.orders.list({ customerId: user!.id }),
    enabled: isAuthenticated && Boolean(user?.id),
  });

  useDocumentTitle('Order history');

  const sortedOrders = useMemo(
    () => [...(orders.data ?? [])].sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt)),
    [orders.data],
  );
  const activeOrders = sortedOrders.filter((order) => matchesFilter(order, 'active'));
  const deliveredOrders = sortedOrders.filter(isDelivered);
  const restaurantCounts = sortedOrders.reduce<Record<string, number>>((counts, order) => {
    counts[order.restaurantName] = (counts[order.restaurantName] ?? 0) + 1;
    return counts;
  }, {});
  const favouriteKitchen = Object.entries(restaurantCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const filteredOrders = sortedOrders.filter((order) => matchesFilter(order, filter));
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const visibleOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const featuredOrder = activeOrders[0];

  const changeFilter = (nextFilter: OrderFilter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  if (!isAuthenticated || !user) return <PageLoader label="Loading your orders…" />;

  return (
    <div className="shell pb-16 pt-9 sm:pb-24 sm:pt-14">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-terracotta-700">Your table, remembered</p>
          <h1 className="mt-2 font-display text-display-md text-olive-900">Order history</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-olive-600">
            Every kitchen you’ve ordered from, every receipt, and a one-tap way to have it again.
          </p>
        </div>
        <ButtonLink to={ROUTES.home} iconRight={<ArrowRight aria-hidden="true" className="h-4 w-4" />}>
          Order again
        </ButtonLink>
      </header>

      {orders.isLoading ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Loading order history">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/70" />
          ))}
        </div>
      ) : orders.isError ? (
        <section className="mt-8 rounded-2xl border border-danger/20 bg-danger/5 p-6" role="alert">
          <h2 className="font-display text-xl text-olive-900">We couldn’t load your orders</h2>
          <p className="mt-2 text-sm text-olive-600">
            {getErrorMessage(orders.error, 'Please try again in a moment.')}
          </p>
          <button
            type="button"
            onClick={() => void orders.refetch()}
            className="mt-4 rounded-full border border-olive-900/20 px-4 py-2 text-xs font-medium text-olive-800 hover:bg-white"
          >
            Try again
          </button>
        </section>
      ) : sortedOrders.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-olive-900/10 bg-white/70 px-6 py-14 text-center shadow-soft">
          <PackageCheck aria-hidden="true" className="mx-auto h-8 w-8 text-olive-400" />
          <h2 className="mt-4 font-display text-2xl text-olive-900">Your next favourite is waiting</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-olive-600">
            Once you place an order, its details and tracking link will be easy to find here.
          </p>
          <ButtonLink className="mt-5" to={ROUTES.home}>Explore restaurants</ButtonLink>
        </section>
      ) : (
        <>
          <section aria-label="Order history highlights" className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-olive-900/10 bg-white/70 p-4">
              <p className="eyebrow text-olive-500">Orders placed</p>
              <p className="mt-1 font-display text-2xl text-olive-900">{sortedOrders.length}</p>
            </div>
            <div className="rounded-2xl border border-olive-900/10 bg-white/70 p-4">
              <p className="eyebrow text-olive-500">Favourite kitchen</p>
              <p className="mt-1 truncate font-display text-2xl text-olive-900">
                {favouriteKitchen ?? '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-olive-900/10 bg-white/70 p-4">
              <p className="eyebrow text-olive-500">Delivered</p>
              <p className="mt-1 font-display text-2xl text-olive-900">{deliveredOrders.length}</p>
            </div>
          </section>

          {featuredOrder ? (
            <section className="mt-8" aria-labelledby="in-progress-heading">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="in-progress-heading" className="eyebrow text-terracotta-700">In progress</h2>
                <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-olive-700">
                  Live order status
                </span>
              </div>
              <div className="flex flex-col gap-4 rounded-2xl bg-olive-800 p-5 text-cream shadow-soft sm:flex-row sm:items-center sm:p-6">
                <Image
                  imageKey={featuredOrder.restaurantImageKey}
                  alt={featuredOrder.restaurantName}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-gold-300">
                    Order {featuredOrder.code}
                  </p>
                  <h3 className="mt-1 font-display text-xl">
                    {featuredOrder.restaurantName} · {featuredOrder.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </h3>
                  <p className="mt-1 text-xs text-cream/65">
                    Placed {formatDay(featuredOrder.placedAt)} · {statusLabels[featuredOrder.status]}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <span className="font-display text-xl tabular-nums">{formatCurrency(featuredOrder.totals.total)}</span>
                  <ButtonLink
                    to={ROUTES.orderTracking(featuredOrder.id)}
                    size="sm"
                    variant="gold"
                    iconRight={<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />}
                  >
                    Track order
                  </ButtonLink>
                </div>
              </div>
            </section>
          ) : null}

          <section className="mt-9" aria-labelledby="orders-list-heading">
            <div className="flex flex-col gap-4 border-b border-olive-900/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1" role="group" aria-label="Filter order history">
                {(Object.keys(filterLabels) as OrderFilter[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={filter === option}
                    onClick={() => changeFilter(option)}
                    className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${
                      filter === option
                        ? 'bg-olive-800 text-cream'
                        : 'text-olive-600 hover:bg-olive-900/[0.05] hover:text-olive-900'
                    }`}
                  >
                    {filterLabels[option]}
                    <span className="ml-1.5 opacity-70">
                      {sortedOrders.filter((order) => matchesFilter(order, option)).length}
                    </span>
                  </button>
                ))}
              </div>
              <h2 id="orders-list-heading" className="sr-only">Your orders</h2>
              <p className="text-[0.6875rem] text-olive-500">
                Newest first <span aria-hidden="true">·</span> {filteredOrders.length} total
              </p>
            </div>

            {visibleOrders.length ? (
              <div className="mt-4 space-y-3">
                {visibleOrders.map((order) => <OrderCard key={order.id} order={order} />)}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-olive-900/15 bg-white/50 px-6 py-10 text-center">
                <p className="text-sm text-olive-600">No {filterLabels[filter].toLowerCase()} to show.</p>
              </div>
            )}

            {pageCount > 1 ? (
              <nav className="mt-5 flex items-center justify-between" aria-label="Order history pages">
                <p className="text-xs text-olive-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={page === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-olive-900/15 text-olive-700 hover:bg-white disabled:opacity-40"
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <span className="min-w-12 text-center text-xs tabular-nums text-olive-600">
                    {page} / {pageCount}
                  </span>
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={page === pageCount}
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-olive-900/15 text-olive-700 hover:bg-white disabled:opacity-40"
                  >
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </nav>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
