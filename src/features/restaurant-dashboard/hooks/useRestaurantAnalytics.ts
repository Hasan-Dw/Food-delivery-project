import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthProvider';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import type { AnalyticsRange } from '@/types';

/**
 * Analytics for the authenticated owner's own restaurant.
 *
 * `restaurantId` comes from the session, never from a URL parameter, so a
 * crafted route cannot request another tenant's financials. The service and a
 * future backend must enforce the same scope.
 */
export function useRestaurantAnalytics(range: AnalyticsRange) {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;

  return useQuery({
    queryKey: restaurantId
      ? queryKeys.restaurantAnalytics(restaurantId, range)
      : ['restaurants', 'none', 'analytics', range],
    queryFn: () => services.analytics.getAnalytics(restaurantId as string, { range }),
    enabled: Boolean(restaurantId),
    // Keep the previous range on screen while the new one loads, so switching
    // ranges does not collapse the dashboard into skeletons.
    placeholderData: keepPreviousData,
  });
}
