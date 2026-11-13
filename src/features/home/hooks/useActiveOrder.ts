import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthProvider';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import type { Order, TrackingSnapshot } from '@/types';

const TERMINAL_ORDER_STATUSES: Order['status'][] = ['COMPLETED', 'CANCELLED', 'REJECTED'];
const TERMINAL_DELIVERY_STATUSES: TrackingSnapshot['deliveryStatus'][] = ['DELIVERED', 'CANCELLED'];

/**
 * The signed-in customer's current order, if any.
 *
 * `GET /orders/active` is scoped to the bearer token on the server, so a guest
 * (or another user) can never see someone else's order here. Queries are
 * disabled entirely for other roles and visitors.
 */
export function useActiveOrder() {
  const { user, isAuthenticated } = useAuth();
  const enabled = isAuthenticated && user?.role === 'CUSTOMER';

  const order = useQuery({
    queryKey: queryKeys.activeOrder,
    queryFn: () => services.orders.getActive(),
    enabled,
    staleTime: 30_000,
  });

  const activeOrder = order.data ?? null;
  const isTerminal =
    !activeOrder ||
    TERMINAL_ORDER_STATUSES.includes(activeOrder.status);

  const tracking = useQuery({
    queryKey: queryKeys.tracking(activeOrder?.id ?? 'none'),
    queryFn: () => services.tracking.getSnapshot(activeOrder!.id),
    enabled: enabled && Boolean(activeOrder?.id) && !isTerminal,
    staleTime: 15_000,
  });

  const snapshot = tracking.data ?? null;
  const hasActiveOrder = Boolean(
    activeOrder && !isTerminal && !(snapshot && TERMINAL_DELIVERY_STATUSES.includes(snapshot.deliveryStatus)),
  );

  return {
    order: activeOrder,
    tracking: snapshot,
    hasActiveOrder,
    isLoading: enabled && order.isLoading,
    error: order.error,
  };
}
