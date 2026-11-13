import { useCallback, useEffect, useRef, useState } from 'react';
import { services } from '@/services';
import type { Coordinates } from '@/types';

const PUBLISH_INTERVAL_MS = 4000;

export type LocationPublisherStatus =
  | 'idle'
  | 'requesting'
  | 'publishing'
  | 'denied'
  | 'unsupported'
  | 'error'
  | 'closed';

export interface LocationPublisherState {
  status: LocationPublisherStatus;
  message?: string;
  lastSentAt?: string;
  position?: Coordinates;
}

interface UseDriverLocationPublisherOptions {
  deliveryId?: string | null;
  /** Only publish while the delivery is assigned and in transit. */
  enabled: boolean;
}

/**
 * Publishes the driver's browser position while a delivery is active.
 *
 * - Uses `navigator.geolocation.watchPosition`, sending at most one update every
 *   4 seconds.
 * - Stops watching when the delivery completes, the component unmounts, or the
 *   browser tab closes. There is no background tracking once the page is closed.
 * - Surfaces permission denial, unsupported browsers and transient GPS errors
 *   instead of silently pretending the location was sent.
 */
export function useDriverLocationPublisher({
  deliveryId,
  enabled,
}: UseDriverLocationPublisherOptions) {
  const [state, setState] = useState<LocationPublisherState>({ status: 'idle' });

  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const inFlight = useRef(false);

  const stop = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !deliveryId) {
      stop();
      setState((prev) => (prev.status === 'idle' ? prev : { status: 'closed' }));
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unsupported', message: 'This browser cannot share GPS position.' });
      return;
    }

    let cancelled = false;
    setState({ status: 'requesting' });

    const publish = async (position: GeolocationPosition) => {
      const now = Date.now();
      if (inFlight.current || now - lastSentAt.current < PUBLISH_INTERVAL_MS) return;

      inFlight.current = true;
      lastSentAt.current = now;
      const coordinates: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      try {
        await services.deliveries.updateLocation(deliveryId, {
          ...coordinates,
          ...(typeof position.coords.heading === 'number' &&
          Number.isFinite(position.coords.heading)
            ? { heading: position.coords.heading }
            : {}),
          ...(Number.isFinite(position.coords.speed) && position.coords.speed !== null
            ? { speedKph: position.coords.speed * 3.6 }
            : {}),
        });

        if (!cancelled) {
          setState({
            status: 'publishing',
            position: coordinates,
            lastSentAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            status: 'error',
            message: error instanceof Error ? error.message : 'The location update was rejected.',
          }));
        }
      } finally {
        inFlight.current = false;
      }
    };

    watchId.current = navigator.geolocation.watchPosition(
      (position) => void publish(position),
      (error) => {
        if (cancelled) return;
        if (error.code === error.PERMISSION_DENIED) {
          setState({
            status: 'denied',
            message: 'Location permission was denied. Enable it in the browser to share your position.',
          });
        } else {
          setState((prev) => ({
            ...prev,
            status: 'error',
            message:
              error.code === error.POSITION_UNAVAILABLE
                ? 'Your position is unavailable right now. Move somewhere with a clearer signal.'
                : 'The GPS request timed out. We will keep trying.',
          }));
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );

    return () => {
      cancelled = true;
      stop();
    };
  }, [deliveryId, enabled, stop]);

  return state;
}
