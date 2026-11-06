import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthProvider';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import type { Delivery, DeliveryAction, DriverAvailability, Order } from '@/types';

export interface DriverDeliveryRow {
  delivery: Delivery;
  order?: Order;
}

/**
 * Driver workspace data boundary. Every query is scoped to the signed-in
 * driver's profile; the UI never asks for another driver's deliveries.
 */
export function useDriverProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.driverByUser(user?.id ?? 'anonymous'),
    queryFn: () => services.drivers.getByUserId(user?.id ?? ''),
    enabled: Boolean(user?.id),
  });
}

export function useDriverActiveContext() {
  const profile = useDriverProfile();
  const driverId = profile.data?.id;

  const activeDelivery = useQuery({
    queryKey: driverId
      ? queryKeys.activeDelivery(driverId)
      : (['deliveries', 'active', 'none'] as const),
    queryFn: () => services.deliveries.getActiveForDriver(driverId ?? ''),
    enabled: Boolean(driverId),
  });

  const orderId = activeDelivery.data?.orderId;

  const order = useQuery({
    queryKey: queryKeys.order(orderId ?? 'none'),
    queryFn: () => services.orders.getById(orderId ?? ''),
    enabled: Boolean(orderId),
  });

  const tracking = useQuery({
    queryKey: queryKeys.tracking(orderId ?? 'none'),
    queryFn: () => services.tracking.getSnapshot(orderId ?? ''),
    enabled: Boolean(orderId),
  });

  return { profile, activeDelivery, order, tracking };
}

export function useDriverHistory(driverId: string | undefined) {
  const deliveriesQuery = useQuery({
    queryKey: driverId ? queryKeys.driverDeliveries(driverId) : (['deliveries', 'driver', 'none'] as const),
    queryFn: () => services.deliveries.list(),
    enabled: Boolean(driverId),
    select: (deliveries) =>
      deliveries.filter(
        (delivery) =>
          delivery.driverId === driverId &&
          (delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED'),
      ),
  });

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders,
    queryFn: () => services.orders.list(),
    enabled: Boolean(driverId),
  });

  const rows = useMemo<DriverDeliveryRow[]>(() => {
    const orders = ordersQuery.data ?? [];
    return (deliveriesQuery.data ?? [])
      .map((delivery) => ({
        delivery,
        order: orders.find((order) => order.id === delivery.orderId),
      }))
      .sort(
        (a, b) =>
          new Date(b.delivery.deliveredAt ?? b.delivery.updatedAt).getTime() -
          new Date(a.delivery.deliveredAt ?? a.delivery.updatedAt).getTime(),
      );
  }, [deliveriesQuery.data, ordersQuery.data]);

  return { deliveriesQuery, ordersQuery, rows };
}

export function useDriverAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      driverId,
      availability,
    }: {
      driverId: string;
      availability: DriverAvailability;
    }) => services.drivers.setAvailability(driverId, availability),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers });
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries });
    },
  });
}

export function useDriverDeliveryAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deliveryId, action }: { deliveryId: string; action: DeliveryAction }) =>
      services.deliveries.transition(deliveryId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers });
      queryClient.invalidateQueries({ queryKey: queryKeys.allTracking });
    },
  });
}
