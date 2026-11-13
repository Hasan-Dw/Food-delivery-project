import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { queryKeys } from '@/lib/query-keys';

/**
 * Profile data lives behind React Query so all mutations can invalidate the
 * same cache entries. The page never calls the service directly.
 */
export function useProfileData() {
  const profile = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => services.users.getProfile(),
  });

  const addresses = useQuery({
    queryKey: queryKeys.addresses,
    queryFn: () => services.users.listAddresses(),
  });

  const paymentMethods = useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: () => services.users.listPaymentMethods(),
  });

  return { profile, addresses, paymentMethods };
}
