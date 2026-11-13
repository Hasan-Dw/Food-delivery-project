import type { TrackingSnapshot } from '@/types';

export type TrackingListener = (snapshot: TrackingSnapshot) => void;

export interface TrackingSubscription {
  /** Stop listening. Always call on unmount. */
  unsubscribe: () => void;
  /** `false` for the demo map, `true` once a live channel is connected. */
  live: boolean;
}

/**
 * Tracking integration boundary.
 *
 * The page only knows this interface. A future implementation can use
 * Server-Sent Events, WebSockets or polling without the UI changing.
 */
export interface TrackingService {
  getSnapshot(orderId: string): Promise<TrackingSnapshot>;
  subscribe(orderId: string, listener: TrackingListener, onError?: (error: Error) => void): TrackingSubscription;
}
