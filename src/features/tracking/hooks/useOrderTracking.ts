import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import { queryKeys } from '@/lib/query-keys';
import type { TrackingSnapshot } from '@/types';

/**
 * Tracking data boundary.
 *
 * REST provides the initial snapshot; when the API enables live tracking the
 * service subscribes to the authenticated Socket.IO channel and each push
 * replaces the cached snapshot in place.
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
      (snapshot: TrackingSnapshot) => {
        queryClient.setQueryData(queryKeys.tracking(orderId), snapshot);
        // A status change is also visible on the order and timeline, so refresh
        // those cheaply rather than guessing the derived shape.
        queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.orderStatusHistory(orderId) });
      },
      () => {
        // Connection problems are non-fatal: the last snapshot stays on screen.
      },
    );

    return () => subscription.unsubscribe();
  }, [orderId, queryClient]);

  return { order, tracking, history };
}
