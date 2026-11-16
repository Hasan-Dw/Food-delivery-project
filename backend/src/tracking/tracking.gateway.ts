import { HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Server, Socket } from 'socket.io';
import { JwtStrategy } from '../auth/jwt.strategy';
import type { JwtPayload } from '../auth/interfaces/auth.interfaces';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TrackingService, type TrackingSnapshotResponse } from './tracking.service';

export const trackingRoom = (orderId: string): string => `order:${orderId}`;

interface TrackingSocketData {
  user?: AuthenticatedUser;
}

type TrackingSocket = Socket & { data: TrackingSocketData };

@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: true, credentials: true },
})
export class TrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly jwtStrategy: JwtStrategy,
    private readonly tracking: TrackingService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Authenticate before the socket is accepted. Doing this in
   * `handleConnection` is too late: the client's `connect` callback fires while
   * the asynchronous JWT/DB validation is still running, so an immediate
   * `tracking:subscribe` would race ahead of authentication and be rejected.
   */
  afterInit(server: Server): void {
    const namespace = server as unknown as Namespace;
    namespace.use((socket, next) => {
      void this.authenticate(socket as TrackingSocket, next);
    });
  }

  private async authenticate(
    client: TrackingSocket,
    next: (error?: Error) => void,
  ): Promise<void> {
    const origin = client.handshake.headers.origin;
    const allowed = this.config.get<string[]>('corsOrigins') ?? [];
    if (origin && allowed.length > 0 && !allowed.includes(origin)) {
      next(
        this.channelError(
          'forbidden_origin',
          'This origin is not allowed to open a tracking channel.',
        ),
      );
      return;
    }

    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('Missing access token.');
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      client.data.user = await this.jwtStrategy.validate(payload);
      next();
    } catch {
      next(
        this.channelError(
          'unauthorized',
          'Sign in again to follow this delivery live.',
        ),
      );
    }
  }

  private channelError(code: string, message: string): Error {
    const error = new Error(message) as Error & { data?: { code: string } };
    error.data = { code };
    return error;
  }

  /** Normalise HTTP/WS errors into the client's `tracking:error` payload. */
  private trackingErrorPayload(error: unknown): { code: string; message: string } {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return { code: 'tracking_error', message: response };
      }
      const record = response as { code?: unknown; message?: unknown };
      const raw = record.message;
      const message = Array.isArray(raw)
        ? raw.join(', ')
        : typeof raw === 'string'
          ? raw
          : 'The live tracking channel rejected this request.';
      return {
        code: typeof record.code === 'string' ? record.code : 'tracking_error',
        message,
      };
    }
    return {
      code: 'tracking_error',
      message: error instanceof Error ? error.message : 'The live tracking channel rejected this request.',
    };
  }

  handleConnection(client: TrackingSocket): void {
    // Middleware has already rejected unauthenticated sockets; this is a
    // defensive guard for unusual adapters that skip middleware.
    if (!client.data.user) {
      client.disconnect(true);
      return;
    }
    this.logger.debug(`Tracking socket connected: ${client.id}`);
  }

  handleDisconnect(client: TrackingSocket): void {
    this.logger.debug(`Tracking socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('tracking:subscribe')
  async subscribe(
    @ConnectedSocket() client: TrackingSocket,
    @MessageBody() body: { orderId?: unknown },
  ): Promise<{ subscribed: boolean }> {
    const user = client.data.user;
    if (!user) {
      client.emit('tracking:error', {
        code: 'unauthorized',
        message: 'Sign in again to follow this delivery live.',
      });
      return { subscribed: false };
    }

    const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
    if (!orderId) {
      client.emit('tracking:error', {
        code: 'invalid_order',
        message: 'The tracking request did not include an order.',
      });
      return { subscribed: false };
    }

    // Throws when the customer, restaurant, driver or admin may not see this
    // order. Only authorized sockets ever join the room.
    try {
      const snapshot = await this.tracking.getSnapshot(user, orderId);
      await client.join(trackingRoom(orderId));
      client.emit('tracking:snapshot', snapshot);
      return { subscribed: true };
    } catch (error) {
      // A thrown WsException only reaches the generic `exception` event. Emit
      // an explicit typed error so clients can show the real reason and stop
      // retrying when the order is not theirs.
      const payload = this.trackingErrorPayload(error);
      client.emit('tracking:error', payload);
      return { subscribed: false };
    }
  }

  @SubscribeMessage('tracking:unsubscribe')
  async unsubscribe(
    @ConnectedSocket() client: TrackingSocket,
    @MessageBody() body: { orderId?: unknown },
  ): Promise<{ subscribed: boolean }> {
    const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
    if (orderId) await client.leave(trackingRoom(orderId));
    return { subscribed: false };
  }

  /**
   * Pushes a freshly computed snapshot to everyone authorized for this order.
   * Called by the delivery service after GPS or lifecycle changes.
   */
  async broadcast(orderId: string): Promise<void> {
    try {
      const room = trackingRoom(orderId);
      const sockets = await this.server?.in(room).fetchSockets();
      if (!sockets || sockets.length === 0) return;

      const snapshot: TrackingSnapshotResponse | null =
        await this.tracking.buildLiveSnapshot(orderId);
      if (!snapshot) return;

      this.server.to(room).emit('tracking:snapshot', snapshot);
    } catch (error) {
      // Live updates must never fail the operation that triggered them.
      this.logger.warn(
        `Could not broadcast tracking for ${orderId}: ${(error as Error).message}`,
      );
    }
  }

  private extractToken(client: TrackingSocket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken) return authToken;

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return null;
  }
}
