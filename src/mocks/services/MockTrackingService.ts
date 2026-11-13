import type { TrackingSnapshot } from '@/types';
import { buildTrackingSnapshot } from '@/mocks/data/tracking';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { TrackingListener, TrackingService, TrackingSubscription } from '@/services/tracking/TrackingService';

/**
 * Demo tracking service.
 *
 * The snapshot is illustrative and flagged `live: false`. No timer emits fake
 * GPS updates: the UI is honest about being in demo mode until a real channel
 * is connected. `subscribe` is a no-op subscription so components can already
 * be written against the final integration pattern.
 */
export class MockTrackingService implements TrackingService {
  async getSnapshot(orderId: string): Promise<TrackingSnapshot> {
    await delay(420);
    const snapshot = buildTrackingSnapshot(orderId);
    if (!snapshot) {
      throw new ApiError({ code: 'tracking_not_found', message: 'Tracking is not available for this order.' }, 404);
    }
    return snapshot;
  }

  subscribe(_orderId: string, _listener: TrackingListener, _onError?: (error: Error) => void): TrackingSubscription {
    return { unsubscribe: () => undefined, live: false };
  }
}
