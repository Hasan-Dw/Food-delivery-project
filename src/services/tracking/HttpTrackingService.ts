import { io, type Socket } from 'socket.io-client';
import type { TrackingSnapshot } from '@/types';
import type { ApiClient } from '@/services/api/client';
import { authToken } from '@/services/api/auth-token';
import { env } from '@/config/env';
import type { TrackingListener, TrackingService, TrackingSubscription } from './TrackingService';

/**
 * The API is mounted at `/api/v1`, but the Socket.IO gateway lives at the
 * server root. Derive the origin so both transports can share one base URL.
 */
function socketOrigin(): string {
  const base = env.apiBaseUrl.replace(/\/api\/v1\/?$/i, '');
  if (typeof window !== 'undefined' && base) {
    try {
      return new URL(base).origin;
    } catch {
      // Fall through to the raw value for unusual deployments.
    }
  }
  return base || (typeof window !== 'undefined' ? window.location.origin : '');
}

function openSocketStream(
  orderId: string,
  listener: TrackingListener,
  onError?: (error: Error) => void,
): TrackingSubscription {
  if (typeof window === 'undefined') {
    return { unsubscribe: () => undefined, live: false };
  }

  const socket: Socket = io(`${socketOrigin()}/tracking`, {
    transports: ['websocket', 'polling'],
    auth: { token: authToken.get() ?? '' },
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  let unauthorized = false;

  const emitSnapshot = (snapshot: TrackingSnapshot) => {
    listener(snapshot);
  };

  const subscribe = () => {
    socket.emit('tracking:subscribe', { orderId });
  };

  const handleError = (payload: { code?: string; message?: string }) => {
    if (payload?.code === 'unauthorized' || payload?.code === 'forbidden_origin') {
      // Authentication cannot recover by retrying; surface it once and stop.
      unauthorized = true;
      socket.disconnect();
    }
    onError?.(new Error(payload?.message ?? 'The live tracking channel reported an error.'));
  };

  socket.on('connect', subscribe);
  socket.on('tracking:snapshot', emitSnapshot);
  socket.on('tracking:error', handleError);
  socket.on('connect_error', (error: Error & { data?: { code?: string } }) => {
    if (error?.data?.code === 'unauthorized' || error?.data?.code === 'forbidden_origin') {
      // Retrying cannot fix a rejected identity; stop the reconnection loop.
      unauthorized = true;
      socket.disconnect();
      onError?.(new Error(error.message));
      return;
    }
    onError?.(new Error('The live tracking connection could not be established.'));
  });

  return {
    unsubscribe: () => {
      if (!unauthorized && socket.connected) {
        socket.emit('tracking:unsubscribe', { orderId });
      }
      socket.off('connect', subscribe);
      socket.off('tracking:snapshot', emitSnapshot);
      socket.off('tracking:error', handleError);
      socket.disconnect();
    },
    live: true,
  };
}

/**
 * HTTP tracking adapter. Snapshots are fetched over REST; live GPS and status
 * changes arrive over the authenticated Socket.IO `/tracking` channel.
 */
export class HttpTrackingService implements TrackingService {
  constructor(private readonly client: ApiClient) {}

  async getSnapshot(orderId: string): Promise<TrackingSnapshot> {
    const response = await this.client.get<TrackingSnapshot>(
      `/orders/${encodeURIComponent(orderId)}/tracking`,
    );
    return response.data;
  }

  subscribe(
    orderId: string,
    listener: TrackingListener,
    onError?: (error: Error) => void,
  ): TrackingSubscription {
    if (!env.features.liveTracking) {
      return { unsubscribe: () => undefined, live: false };
    }
    return openSocketStream(orderId, listener, onError);
  }
}
