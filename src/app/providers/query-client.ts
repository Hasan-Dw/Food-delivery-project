import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/services/api/errors';

/** Retry transient network/5xx failures only; never retry a rejected form. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error)) {
    if ([400, 401, 403, 404, 409, 422].includes(error.status)) return false;
    if (error.isNetworkError) return failureCount < 2;
    return failureCount < 1;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: {
      retry: 0,
    },
  },
});
