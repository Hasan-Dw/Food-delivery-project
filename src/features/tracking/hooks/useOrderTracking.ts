import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import { queryKeys } from '@/lib/query-keys';

/**
 * Tracking data boundary.
 *
 * The page reads query data, and the service exposes a subscription for a
 * future SSE/WebSocket channel. The mock returns a no-op subscription with
 * `live: false`, so this UI never pretends to be receiving GPS updates.
 */
export function useOrderTracking(orderId: string) {
  const queryClient = useQueryClient();

  const order = useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => services.orders.getById(orderId),
    enabled: Boolean(orderId),
  });

  const tracking = useQuery({
    queryKey: queryKeys.tracking(orderId),
    queryFn: () => services.tracking.getSnapshot(orderId),
    enabled: Boolean(orderId),
  });

  const history = useQuery({
    queryKey: queryKeys.orderStatusHistory(orderId),
    queryFn: () => services.orders.getStatusHistory(orderId),
    enabled: Boolean(orderId),
  });

  useEffect(() => {
    if (!orderId) return;

    const subscription = services.tracking.subscribe(
      orderId,
      () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking(orderId) });
      },
      () => {
        // A production channel would surface a non-blocking connection warning.
      },
    );

    return () => subscription.unsubscribe();
  }, [orderId, queryClient]);

  return { order, tracking, history };
}
