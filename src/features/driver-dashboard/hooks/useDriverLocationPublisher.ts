import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

const IDLE_STATE: LocationPublisherState = { status: 'idle' };
export const DriverLocationPublisherContext =
  createContext<LocationPublisherState>(IDLE_STATE);

interface UseDriverLocationPublisherOptions {
  driverId?: string | null;
  availability: 'OFFLINE' | 'AVAILABLE' | 'ON_DELIVERY';
  deliveryId?: string | null;
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
  driverId,
  availability,
  deliveryId,
}: UseDriverLocationPublisherOptions) {
  const [state, setState] = useState<LocationPublisherState>({ status: 'idle' });

  const watchId = useRef<number | null>(null);
  const inFlightRequest = useRef<Promise<void> | null>(null);
  const sessionId = useRef(0);

  const stop = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  useEffect(() => {
    const currentSession = ++sessionId.current;
    const isCurrentSession = () => currentSession === sessionId.current;
    let lastSentAt = 0;
    let cancelled = false;

    const shouldPublishDriverLocation =
      Boolean(driverId) && availability === 'AVAILABLE' && !deliveryId;
    const shouldPublishDeliveryLocation =
      Boolean(driverId) &&
      availability === 'ON_DELIVERY' &&
      Boolean(deliveryId);

    if (!shouldPublishDriverLocation && !shouldPublishDeliveryLocation) {
      stop();
      if (isCurrentSession()) {
        setState((prev) => (prev.status === 'idle' ? prev : { status: 'closed' }));
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({
        status: 'unsupported',
        message: 'This browser cannot share GPS position.',
      });
      return;
    }

    setState({ status: 'requesting' });

    const publish = async (position: GeolocationPosition) => {
      const now = Date.now();
      if (
        cancelled ||
        !isCurrentSession() ||
        inFlightRequest.current ||
        now - lastSentAt < PUBLISH_INTERVAL_MS
      ) {
        return;
      }

      const coordinates: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      const request = (async () => {
        const input = {
          ...coordinates,
          ...(typeof position.coords.heading === 'number' &&
          Number.isFinite(position.coords.heading)
            ? { heading: position.coords.heading }
            : {}),
          ...(Number.isFinite(position.coords.speed) && position.coords.speed !== null
            ? { speedKph: position.coords.speed * 3.6 }
            : {}),
        };

        if (shouldPublishDeliveryLocation && deliveryId) {
          await services.deliveries.updateLocation(deliveryId, input);
        } else if (shouldPublishDriverLocation && driverId) {
          await services.drivers.updateLocation(driverId, input);
        } else {
          return;
        }

        lastSentAt = Date.now();
        if (!cancelled && isCurrentSession()) {
          setState({
            status: 'publishing',
            position: coordinates,
            lastSentAt: new Date().toISOString(),
          });
        }
      })();
      inFlightRequest.current = request;

      try {
        await request;
      } catch (error) {
        if (!cancelled && isCurrentSession()) {
          setState((prev) => ({
            ...prev,
            status: 'error',
            message: error instanceof Error ? error.message : 'The location update was rejected.',
          }));
        }
      } finally {
        if (inFlightRequest.current === request) {
          inFlightRequest.current = null;
        }
      }
    };

    watchId.current = navigator.geolocation.watchPosition(
      (position) => void publish(position),
      (error) => {
        if (cancelled || !isCurrentSession()) return;
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
  }, [availability, deliveryId, driverId, stop]);

  return state;
}

export function useDriverLocationPublisherState(): LocationPublisherState {
  return useContext(DriverLocationPublisherContext);
}
