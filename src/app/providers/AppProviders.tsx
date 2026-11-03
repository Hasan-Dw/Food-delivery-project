import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';
import { AuthProvider } from './AuthProvider';
import { Toaster } from '@/components/ui/Toaster';

/**
 * Global providers. Kept intentionally small: server cache, auth boundary,
 * and the single toast outlet. UI state lives in small Zustand stores.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
