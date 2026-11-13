import { env } from '@/config/env';
import type { TrackingSnapshot } from '@/types';
import { DeliveryMap } from './DeliveryMap';
import { LiveDeliveryMap } from './LiveDeliveryMap';

/**
 * Chooses the real tile map for API-backed data and the labelled illustration
 * for the in-browser demo. Both consume the same `TrackingSnapshot` contract.
 */
export function TrackingMap({ snapshot }: { snapshot: TrackingSnapshot }) {
  if (env.useMocks && !snapshot.live) {
    return <DeliveryMap snapshot={snapshot} />;
  }
  return <LiveDeliveryMap snapshot={snapshot} />;
}
