import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import type { PromotionInput } from '@/types';

export function useRestaurantPromotions() {
  return useQuery({
    queryKey: queryKeys.restaurantPromotions,
    queryFn: () => services.promotions.listMine(),
  });
}

export function usePromotionPolicy() {
  return useQuery({
    queryKey: queryKeys.promotionPolicy,
    queryFn: () => services.promotions.getPolicy(),
    staleTime: 60 * 60 * 1000,
  });
}

function useInvalidatePromotions() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.restaurantPromotions });
    queryClient.invalidateQueries({ queryKey: queryKeys.promotions });
    queryClient.invalidateQueries({ queryKey: queryKeys.allAdminPromotions });
  };
}

export function useCreateRestaurantPromotion() {
  const invalidate = useInvalidatePromotions();

  return useMutation({
    mutationFn: (input: PromotionInput) =>
      services.promotions.createMine(input),
    onSuccess: invalidate,
  });
}

export function useUpdateRestaurantPromotion() {
  const invalidate = useInvalidatePromotions();

  return useMutation({
    mutationFn: ({
      promotionId,
      input,
    }: {
      promotionId: string;
      input: Partial<PromotionInput>;
    }) => services.promotions.updateMine(promotionId, input),
    onSuccess: invalidate,
  });
}

export function useSetRestaurantPromotionStatus() {
  const invalidate = useInvalidatePromotions();

  return useMutation({
    mutationFn: ({
      promotionId,
      active,
    }: {
      promotionId: string;
      active: boolean;
    }) => services.promotions.setStatusMine(promotionId, active),
    onSuccess: invalidate,
  });
}

export function useDeleteRestaurantPromotion() {
  const invalidate = useInvalidatePromotions();

  return useMutation({
    mutationFn: (promotionId: string) =>
      services.promotions.removeMine(promotionId),
    onSuccess: invalidate,
  });
}
