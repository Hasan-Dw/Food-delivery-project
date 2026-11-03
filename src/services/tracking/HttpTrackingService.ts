import type { TrackingSnapshot } from '@/types';
import type { ApiClient } from '@/services/api/client';
import { env } from '@/config/env';
import type { TrackingListener, TrackingService, TrackingSubscription } from './TrackingService';

/** Server-Sent Events channel. Used only when a backend enables live tracking. */
function openEventStream(
  orderId: string,
  listener: TrackingListener,
  onError?: (error: Error) => void,
): TrackingSubscription {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return { unsubscribe: () => undefined, live: false };
  }

  const url = `${env.apiBaseUrl}/orders/${encodeURIComponent(orderId)}/tracking/stream`;
  const source = new EventSource(url, { withCredentials: true });

  const handleSnapshot = (event: MessageEvent<string>) => {
    try {
      listener(JSON.parse(event.data) as TrackingSnapshot);
    } catch {
      onError?.(new Error('Received an unreadable tracking update.'));
    }
  };

  source.addEventListener('snapshot', handleSnapshot as EventListener);
  source.onerror = () => {
    onError?.(new Error('The live tracking connection was interrupted.'));
  };

  return {
    unsubscribe: () => {
      source.removeEventListener('snapshot', handleSnapshot as EventListener);
      source.close();
    },
    live: true,
  };
}

/**
 * HTTP tracking adapter. When live tracking is not configured it refuses to
 * open a channel and the UI remains in clearly-labelled demo mode.
 */
export class HttpTrackingService implements TrackingService {
  constructor(private readonly client: ApiClient) {}

  async getSnapshot(orderId: string): Promise<TrackingSnapshot> {
    const response = await this.client.get<TrackingSnapshot>(
      `/orders/${encodeURIComponent(orderId)}/tracking`,
    );
    return response.data;
  }

  subscribe(orderId: string, listener: TrackingListener, onError?: (error: Error) => void): TrackingSubscription {
    if (!env.features.liveTracking) {
      return { unsubscribe: () => undefined, live: false };
    }
    return openEventStream(orderId, listener, onError);
  }
}
