import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthProvider';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import type { OrderAction } from '@/types';

export function useRestaurantOrders() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;

  return useQuery({
    queryKey: restaurantId ? queryKeys.restaurantOrders(restaurantId) : ['orders', 'restaurant', 'none'],
    queryFn: () => services.orders.list({ restaurantId }),
    enabled: Boolean(restaurantId),
  });
}

export function useRestaurantOrder(orderId: string) {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const order = useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => services.orders.getById(orderId),
    enabled: Boolean(orderId),
  });

  return {
    ...order,
    belongsToRestaurant: Boolean(
      order.data && restaurantId && order.data.restaurantId === restaurantId,
    ),
  };
}

export function useRestaurantOrderHistory(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orderStatusHistory(orderId),
    queryFn: () => services.orders.getStatusHistory(orderId),
    enabled: Boolean(orderId),
  });
}

export function useRestaurantDelivery(orderId: string) {
  return useQuery({
    queryKey: queryKeys.deliveryForOrder(orderId),
    queryFn: () => services.deliveries.getByOrderId(orderId),
    enabled: Boolean(orderId),
  });
}

export function useRestaurantOrderAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, action }: { orderId: string; action: OrderAction }) =>
      services.orders.transition(orderId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries });
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers });
    },
  });
}

export function useRestaurantProfile() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;

  return useQuery({
    queryKey: restaurantId ? queryKeys.restaurant(restaurantId) : ['restaurants', 'none'],
    queryFn: () => services.restaurants.getById(restaurantId ?? ''),
    enabled: Boolean(restaurantId),
  });
}
