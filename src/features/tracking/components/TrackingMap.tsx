import type { TrackingSnapshot } from '@/types';
import { LiveDeliveryMap } from './LiveDeliveryMap';

/**
 * Renders the live tile map for API-backed tracking snapshots. Delivery state
 * always comes from the backend, never from a local illustration.
 */
export function TrackingMap({ snapshot }: { snapshot: TrackingSnapshot }) {
  return <LiveDeliveryMap snapshot={snapshot} />;
}
