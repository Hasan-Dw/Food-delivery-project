import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthProvider';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import type { ProductInput } from '@/services/products/ProductService';
import type { RestaurantUpdateInput } from '@/services/restaurants/RestaurantService';
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

export function useRestaurantMenu(restaurantId: string | undefined) {
  return useQuery({
    queryKey: restaurantId
      ? queryKeys.restaurantProducts(restaurantId)
      : ['products', 'restaurant', 'none'],
    queryFn: () => services.products.listByRestaurant(restaurantId ?? ''),
    enabled: Boolean(restaurantId),
  });
}

export function useMenuCategories(restaurantId: string | undefined) {
  return useQuery({
    queryKey: restaurantId
      ? queryKeys.productCategories(restaurantId)
      : ['product-categories', 'none'],
    queryFn: () => services.products.listCategories(restaurantId ?? ''),
    enabled: Boolean(restaurantId),
  });
}

/** Invalidates every menu surface after an item or image change. */
function useMenuInvalidation(restaurantId: string | undefined) {
  const queryClient = useQueryClient();

  return () => {
    if (restaurantId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurantProducts(restaurantId) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.popularProducts });
  };
}

export function useMenuItemMutations(restaurantId: string | undefined) {
  const invalidate = useMenuInvalidation(restaurantId);

  const create = useMutation({
    mutationFn: (input: ProductInput) =>
      services.products.create(restaurantId ?? '', input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: Partial<ProductInput> }) =>
      services.products.update(productId, input),
    onSuccess: invalidate,
  });

  const setAvailability = useMutation({
    mutationFn: ({ productId, available }: { productId: string; available: boolean }) =>
      services.products.setAvailability(productId, available),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (productId: string) => services.products.remove(productId),
    onSuccess: invalidate,
  });

  const uploadImage = useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) =>
      services.products.uploadImage(productId, file),
    onSuccess: invalidate,
  });

  const removeImage = useMutation({
    mutationFn: (productId: string) => services.products.removeImage(productId),
    onSuccess: invalidate,
  });

  return { create, update, setAvailability, remove, uploadImage, removeImage };
}

/** Invalidates the cached restaurant profile after a cover/logo change. */
export function useRestaurantInvalidation() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const queryClient = useQueryClient();

  return () => {
    if (restaurantId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurant(restaurantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
    }
  };
}

export function useRestaurantImageMutations() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId ?? '';
  const invalidate = useRestaurantInvalidation();

  const uploadCover = useMutation({
    mutationFn: (file: File) => services.restaurants.uploadCoverImage(restaurantId, file),
    onSuccess: invalidate,
  });

  const removeCover = useMutation({
    mutationFn: () => services.restaurants.removeCoverImage(restaurantId),
    onSuccess: invalidate,
  });

  const uploadLogo = useMutation({
    mutationFn: (file: File) => services.restaurants.uploadLogo(restaurantId, file),
    onSuccess: invalidate,
  });

  const removeLogo = useMutation({
    mutationFn: () => services.restaurants.removeLogo(restaurantId),
    onSuccess: invalidate,
  });

  return { uploadCover, removeCover, uploadLogo, removeLogo };
}

/** Saves restaurant profile fields and the operator-selected map pin. */
export function useRestaurantProfileMutations() {
  const invalidate = useRestaurantInvalidation();

  const update = useMutation({
    mutationFn: ({
      restaurantId,
      input,
    }: {
      restaurantId: string;
      input: RestaurantUpdateInput;
    }) => services.restaurants.update(restaurantId, input),
    onSuccess: invalidate,
  });

  return { update };
}
