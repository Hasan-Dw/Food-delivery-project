import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrackingSnapshot } from '@/types';

const unsubscribe = vi.fn();
let pushedListener: ((snapshot: TrackingSnapshot) => void) | undefined;

const activeDelivery = {
  id: 'delivery-1',
  orderId: 'order-1',
  driverId: 'driver-1',
  status: 'ON_THE_WAY',
};

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1', role: 'DRIVER' } }),
}));

vi.mock('@/services', () => ({
  services: {
    drivers: {
      getByUserId: vi.fn(async () => ({ id: 'driver-1' })),
    },
    deliveries: {
      getActiveForDriver: vi.fn(async () => activeDelivery),
    },
    orders: {
      getById: vi.fn(async () => ({ id: 'order-1' })),
    },
    tracking: {
      getSnapshot: vi.fn(async () => ({
        orderId: 'order-1',
        etaMinutes: 12,
      })),
      subscribe: vi.fn(
        (
          _orderId: string,
          listener: (snapshot: TrackingSnapshot) => void,
        ) => {
          pushedListener = listener;
          return { unsubscribe };
        },
      ),
    },
  },
}));

import { useDriverActiveContext } from './useDriverDashboard';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  pushedListener = undefined;
  vi.clearAllMocks();
});

describe('useDriverActiveContext', () => {
  it('subscribes to live tracking and updates the route without a reload', async () => {
    const { result, unmount } = renderHook(() => useDriverActiveContext(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.tracking.data).toMatchObject({ etaMinutes: 12 });
    });

    expect(pushedListener).toBeTypeOf('function');

    // The backend pushes a new navigation stage after pickup, switching the
    // route endpoint from the restaurant to the customer.
    const pickedUp = {
      orderId: 'order-1',
      etaMinutes: 7,
      route: { points: [], distanceKm: 1.2, source: 'osrm', geometry: null },
    } as unknown as TrackingSnapshot;

    pushedListener!(pickedUp);

    await waitFor(() => {
      expect(result.current.tracking.data).toMatchObject({
        etaMinutes: 7,
      });
    });

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
