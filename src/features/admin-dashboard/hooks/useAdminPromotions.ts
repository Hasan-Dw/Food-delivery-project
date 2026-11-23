import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import type { PromotionInput, PromotionQuery } from '@/types';

export function useAdminPromotions(query: PromotionQuery = {}) {
  return useQuery({
    queryKey: queryKeys.adminPromotions({
      scope: query.scope,
      status: query.status,
      restaurantId: query.restaurantId,
      q: query.q,
    }),
    queryFn: () => services.promotions.listAdmin(query),
  });
}

function useInvalidatePromotions() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.allAdminPromotions });
    queryClient.invalidateQueries({ queryKey: queryKeys.promotions });
    queryClient.invalidateQueries({ queryKey: queryKeys.restaurantPromotions });
  };
}

export function useCreatePromotion() {
  const invalidate = useInvalidatePromotions();

  return useMutation({
    mutationFn: (input: PromotionInput) => services.promotions.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePromotion() {
  const invalidate = useInvalidatePromotions();

  return useMutation({
    mutationFn: ({
      promotionId,
      input,
    }: {
      promotionId: string;
      input: Partial<PromotionInput>;
    }) => services.promotions.update(promotionId, input),
    onSuccess: invalidate,
  });
}

export function useSetPromotionStatus() {
  const invalidate = useInvalidatePromotions();

  return useMutation({
    mutationFn: ({
      promotionId,
      active,
    }: {
      promotionId: string;
      active: boolean;
    }) => services.promotions.setStatus(promotionId, active),
    onSuccess: invalidate,
  });
}

export function useDeletePromotion() {
  const invalidate = useInvalidatePromotions();

  return useMutation({
    mutationFn: (promotionId: string) => services.promotions.remove(promotionId),
    onSuccess: invalidate,
  });
}
