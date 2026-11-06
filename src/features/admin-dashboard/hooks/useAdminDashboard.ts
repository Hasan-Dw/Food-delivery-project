import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import type {
  AccountStatus,
  Delivery,
  Driver,
  Order,
  Restaurant,
  User,
} from '@/types';

export interface AdminDeliveryRow {
  delivery: Delivery;
  order?: Order;
  driver?: Driver;
  restaurant?: Restaurant;
}

export function useAdminAccounts() {
  return useQuery({
    queryKey: queryKeys.adminAccounts,
    queryFn: () => services.admin.listAccounts(),
  });
}

export function useAdminDrivers() {
  return useQuery({
    queryKey: queryKeys.adminDrivers,
    queryFn: () => services.admin.listDrivers(),
  });
}

/** Restaurant directory, used for service-area validation in the dialog. */
export function useAdminRestaurants() {
  return useQuery({
    queryKey: queryKeys.restaurants,
    queryFn: () => services.restaurants.list({ perPage: 100 }),
    select: (page) => page.items,
  });
}

export function useAdminDeliveries() {
  const deliveries = useQuery({
    queryKey: queryKeys.adminDeliveries,
    queryFn: () => services.deliveries.list(),
  });
  const orders = useQuery({
    queryKey: queryKeys.adminOrders,
    queryFn: () => services.orders.list(),
  });
  const drivers = useAdminDrivers();
  const restaurants = useAdminRestaurants();

  return { deliveries, orders, drivers, restaurants };
}

export function useAdminOrders() {
  const orders = useQuery({
    queryKey: queryKeys.adminOrders,
    queryFn: () => services.orders.list(),
  });
  const deliveries = useQuery({
    queryKey: queryKeys.adminDeliveries,
    queryFn: () => services.deliveries.list(),
  });

  return { orders, deliveries };
}

function useAdminInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminAccounts });
    queryClient.invalidateQueries({ queryKey: queryKeys.adminDrivers });
    queryClient.invalidateQueries({ queryKey: queryKeys.adminDeliveries });
    queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    queryClient.invalidateQueries({ queryKey: queryKeys.deliveries });
    queryClient.invalidateQueries({ queryKey: queryKeys.drivers });
    queryClient.invalidateQueries({ queryKey: queryKeys.allTracking });
    queryClient.invalidateQueries({ queryKey: queryKeys.allAnalytics });
  };
}

export function useUpdateAccountStatus() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: ({
      userId,
      status,
      reason,
      actorId,
    }: {
      userId: string;
      status: AccountStatus;
      reason?: string;
      actorId?: string | null;
    }) => services.admin.updateAccountStatus(userId, status, reason, { actorId }),
    onSuccess: (user) => {
      invalidate();
      return user;
    },
  });
}

export function useAssignDelivery() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: ({
      deliveryId,
      driverId,
      actorId,
    }: {
      deliveryId: string;
      driverId: string;
      actorId?: string | null;
    }) => services.deliveries.assign(deliveryId, driverId, { actorId }),
    onSuccess: invalidate,
  });
}

export function useAutoAssignDelivery() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: ({
      deliveryId,
      actorId,
    }: {
      deliveryId: string;
      actorId?: string | null;
    }) =>
      services.deliveries.autoAssign(deliveryId, {
        trigger: 'ADMIN_RETRY',
        actorId,
        force: true,
      }),
    onSuccess: invalidate,
  });
}

export function useUnassignDelivery() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: ({
      deliveryId,
      reason,
      actorId,
    }: {
      deliveryId: string;
      reason: string;
      actorId?: string | null;
    }) => services.deliveries.unassign(deliveryId, reason, { actorId }),
    onSuccess: invalidate,
  });
}

export function useReassignDelivery() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: ({
      deliveryId,
      driverId,
      reason,
      actorId,
    }: {
      deliveryId: string;
      driverId: string;
      reason: string;
      actorId?: string | null;
    }) => services.deliveries.reassign(deliveryId, driverId, reason, { actorId }),
    onSuccess: invalidate,
  });
}

/** Derive delivery rows once so pages do not repeat the joins. */
export function buildAdminDeliveryRows(
  deliveries: Delivery[],
  orders: Order[],
  drivers: Driver[],
  restaurants: Restaurant[] = [],
): AdminDeliveryRow[] {
  return [...deliveries]
    .map((delivery) => ({
      delivery,
      order: orders.find((order) => order.id === delivery.orderId),
      driver: drivers.find((driver) => driver.id === delivery.driverId),
      restaurant: restaurants.find((restaurant) => restaurant.id === delivery.restaurantId),
    }))
    .sort((a, b) => new Date(b.delivery.updatedAt).getTime() - new Date(a.delivery.updatedAt).getTime());
}

export function accountDisplayName(account: User): string {
  return account.fullName || account.email;
}
