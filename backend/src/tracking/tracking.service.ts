import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeliveryStatus } from '../common/enums/delivery.enum';
import { OrderStatus } from '../common/enums/order.enum';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  DEFAULT_PREP_MINUTES,
  HANDOVER_BUFFER_MINUTES,
  PICKUP_BUFFER_MINUTES,
  type CoordinatesInput,
} from '../common/utils/geo.util';
import { Delivery, type DeliveryDocument } from '../deliveries/schemas/delivery.schema';
import { toDriverResponse } from '../drivers/interfaces/driver-response.interface';
import { Order, type OrderDocument } from '../orders/schemas/order.schema';
import {
  Restaurant,
  type RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import { RoutingService, type RouteGeometry, type RouteSource } from '../routing/routing.service';
import { DriverProfile, type DriverProfileDocument } from '../users/schemas/driver-profile.schema';
import { User, type UserDocument } from '../users/schemas/user.schema';

type Coordinates = CoordinatesInput;

export type EtaSource = RouteSource | 'none';

export interface TrackingSnapshotResponse {
  orderId: string;
  deliveryId?: string;
  orderStatus: string;
  deliveryStatus: string;
  driver?: ReturnType<typeof toDriverResponse>;
  driverLocation: {
    driverId: string;
    deliveryId?: string;
    lat: number;
    lng: number;
    heading?: number;
    speedKph?: number;
    updatedAt: string;
  } | null;
  /** `null` when no coordinates exist to route between. */
  etaMinutes: number | null;
  estimatedArrivalAt?: string;
  deliveredAt?: string;
  destination: {
    label: string;
    address: string;
    coordinates: Coordinates;
  };
  restaurant: {
    label: string;
    address: string;
    coordinates: Coordinates;
  };
  route: {
    points: Coordinates[];
    distanceKm: number;
    source: EtaSource;
    /**
     * GeoJSON road geometry when the routing provider was reachable. `null`
     * means the two-point straight-line fallback, which the map labels.
     */
    geometry: RouteGeometry | null;
  };
  /** Remaining road distance in kilometres (driver → next stop → door). */
  remainingDistanceKm: number | null;
  etaSource: EtaSource;
  progress: number;
  lastUpdated: string;
  /** True when the API publishes live updates over Socket.IO. */
  live: boolean;
}

const PROGRESS_BY_STATUS: Record<DeliveryStatus, number> = {
  [DeliveryStatus.PENDING_ASSIGNMENT]: 0,
  [DeliveryStatus.ASSIGNED]: 0.15,
  [DeliveryStatus.PICKED_UP]: 0.45,
  [DeliveryStatus.ON_THE_WAY]: 0.75,
  [DeliveryStatus.DELIVERED]: 1,
  [DeliveryStatus.CANCELLED]: 0,
};

function roundDistance(value: number): number {
  return Math.round(value * 10) / 10;
}

function mergeSource(sources: EtaSource[]): EtaSource {
  if (sources.every((source) => source === 'none')) return 'none';
  return sources.includes('straight-line') ? 'straight-line' : 'osrm';
}

/**
 * Joins consecutive road legs into one LineString. A missing geometry means at
 * least one leg was a straight-line estimate, so the combined route must not be
 * presented as fully road-derived.
 */
function mergeGeometry(legs: Array<RouteGeometry | null>): RouteGeometry | null {
  if (legs.length === 0) return null;
  if (legs.some((leg) => leg === null)) return null;

  const coordinates: Array<[number, number]> = [];
  for (const leg of legs as RouteGeometry[]) {
    for (const coordinate of leg.coordinates) {
      const previous = coordinates[coordinates.length - 1];
      if (previous && previous[0] === coordinate[0] && previous[1] === coordinate[1]) {
        continue;
      }
      coordinates.push(coordinate);
    }
  }

  if (coordinates.length < 2) return null;
  return { type: 'LineString', coordinates };
}

@Injectable()
export class TrackingService {
  private readonly liveEnabled: boolean;

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Delivery.name)
    private readonly deliveryModel: Model<DeliveryDocument>,
    @InjectModel(DriverProfile.name)
    private readonly driverModel: Model<DriverProfileDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    private readonly routing: RoutingService,
    config: ConfigService,
  ) {
    this.liveEnabled = config.get<boolean>('tracking.liveEnabled') ?? true;
  }

  async getSnapshot(
    actor: AuthenticatedUser,
    orderId: string,
  ): Promise<TrackingSnapshotResponse> {
    const order = await this.findOrder(orderId);
    const delivery = await this.deliveryModel.findOne({ orderId: order._id }).exec();
    await this.assertCanView(actor, order, delivery);
    return this.buildSnapshot(order, delivery);
  }

  /**
   * Internal snapshot for the live channel. Authorization happens when a socket
   * subscribes to the order room; this method is never exposed over HTTP.
   */
  async buildLiveSnapshot(orderId: string): Promise<TrackingSnapshotResponse | null> {
    if (!Types.ObjectId.isValid(orderId)) return null;
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) return null;
    const delivery = await this.deliveryModel.findOne({ orderId: order._id }).exec();
    return this.buildSnapshot(order, delivery);
  }

  private async findOrder(orderId: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException({
        code: 'order_not_found',
        message: 'That order could not be found.',
      });
    }

    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException({
        code: 'order_not_found',
        message: 'That order could not be found.',
      });
    }
    return order;
  }

  private async buildSnapshot(
    order: OrderDocument,
    delivery: DeliveryDocument | null,
  ): Promise<TrackingSnapshotResponse> {
    const restaurant = await this.restaurantModel.findById(order.restaurantId).exec();

    const restaurantCoordinates =
      restaurant?.address?.coordinates ?? order.deliveryAddress.coordinates ?? null;
    const destinationCoordinates = order.deliveryAddress.coordinates ?? restaurantCoordinates;

    const driver = delivery?.driverId
      ? await this.driverModel.findById(delivery.driverId).exec()
      : null;
    const driverUser =
      driver ? await this.userModel.findById(driver.userId).exec() : null;

    const deliveryStatus =
      (delivery?.status as DeliveryStatus | undefined) ??
      DeliveryStatus.PENDING_ASSIGNMENT;

    const driverLocation = this.mapDriverLocation(delivery, driver);
    const now = new Date();
    const timing = await this.resolveTiming({
      order,
      driver,
      driverStatus: deliveryStatus,
      driverLocation,
      restaurantCoordinates,
      destinationCoordinates,
      now,
    });

    const lastUpdated =
      delivery?.updatedAt ?? order.updatedAt ?? order.placedAt ?? now;

    const snapshot: TrackingSnapshotResponse = {
      orderId: order._id.toString(),
      orderStatus: order.status,
      deliveryStatus,
      driverLocation,
      etaMinutes: timing.etaMinutes,
      destination: {
        label: order.deliveryAddress.label,
        address: [
          order.deliveryAddress.line1,
          order.deliveryAddress.city,
          order.deliveryAddress.state,
        ]
          .filter(Boolean)
          .join(', '),
        coordinates: destinationCoordinates ?? { lat: 0, lng: 0 },
      },
      restaurant: {
        label: restaurant?.name ?? order.restaurantName,
        address: restaurant
          ? [restaurant.address.line1, restaurant.address.city, restaurant.address.state]
              .filter(Boolean)
              .join(', ')
          : '',
        coordinates: restaurantCoordinates ?? { lat: 0, lng: 0 },
      },
      route: {
        points: timing.points,
        distanceKm: timing.remainingDistanceKm ?? 0,
        source: timing.source,
        geometry: timing.geometry,
      },
      remainingDistanceKm: timing.remainingDistanceKm,
      etaSource: timing.source,
      progress: PROGRESS_BY_STATUS[deliveryStatus] ?? 0,
      lastUpdated: lastUpdated.toISOString(),
      live: this.liveEnabled,
    };

    if (delivery) {
      snapshot.deliveryId = delivery._id.toString();
      if (delivery.estimatedArrivalAt) {
        snapshot.estimatedArrivalAt = delivery.estimatedArrivalAt.toISOString();
      }
      if (delivery.deliveredAt) {
        snapshot.deliveredAt = delivery.deliveredAt.toISOString();
      }
    }

    if (driver && driverUser) {
      snapshot.driver = toDriverResponse(driver, driverUser);

      // Tracking is not the delivery lifecycle; a delivered or cancelled
      // delivery should not still publish a moving driver.
      if (
        deliveryStatus === DeliveryStatus.DELIVERED ||
        deliveryStatus === DeliveryStatus.CANCELLED
      ) {
        snapshot.driverLocation = null;
      }
    }

    return snapshot;
  }

  /**
   * Composes the ETA from real legs:
   * - driver → restaurant (parallel with kitchen preparation, so the larger wins)
   * - pickup handling
   * - restaurant → customer
   *
   * Once the food is collected only the final leg remains. Each leg is a real
   * road route when the routing provider is reachable, and a labelled estimate
   * otherwise.
   */
  private async resolveTiming(input: {
    order: OrderDocument;
    driver: DriverProfileDocument | null;
    driverStatus: DeliveryStatus;
    driverLocation: TrackingSnapshotResponse['driverLocation'];
    restaurantCoordinates: Coordinates | null;
    destinationCoordinates: Coordinates | null;
    now: Date;
  }): Promise<{
    etaMinutes: number | null;
    remainingDistanceKm: number | null;
    points: Coordinates[];
    geometry: RouteGeometry | null;
    source: EtaSource;
  }> {
    const {
      order,
      driver,
      driverStatus,
      driverLocation,
      restaurantCoordinates,
      destinationCoordinates,
      now,
    } = input;

    const empty = {
      etaMinutes: null,
      remainingDistanceKm: null,
      points: [] as Coordinates[],
      geometry: null as RouteGeometry | null,
      source: 'none' as EtaSource,
    };

    if (
      driverStatus === DeliveryStatus.DELIVERED ||
      driverStatus === DeliveryStatus.CANCELLED ||
      order.status === OrderStatus.CANCELLED
    ) {
      return { ...empty, etaMinutes: 0, remainingDistanceKm: 0 };
    }

    const vehicle = driver?.vehicle;
    const prepRemaining = this.remainingPrepMinutes(order, now);
    const position: Coordinates | null = driverLocation
      ? { lat: driverLocation.lat, lng: driverLocation.lng }
      : null;
    const pickedUp =
      driverStatus === DeliveryStatus.PICKED_UP ||
      driverStatus === DeliveryStatus.ON_THE_WAY;

    // Final leg: restaurant → customer (or current position → customer).
    if (!destinationCoordinates) return empty;

    if (pickedUp) {
      if (!position) return empty;
      const leg = await this.routing.getRoute(position, destinationCoordinates, vehicle);
      return {
        etaMinutes: leg.durationMinutes + HANDOVER_BUFFER_MINUTES,
        remainingDistanceKm: roundDistance(leg.distanceKm),
        points: leg.points,
        geometry: leg.geometry,
        source: leg.source,
      };
    }

    const toCustomer = restaurantCoordinates
      ? await this.routing.getRoute(
          restaurantCoordinates,
          destinationCoordinates,
          vehicle,
        )
      : null;

    if (!position) {
      // No driver yet: the kitchen is still the only active leg.
      if (!toCustomer) return empty;
      return {
        etaMinutes:
          prepRemaining + PICKUP_BUFFER_MINUTES + toCustomer.durationMinutes,
        remainingDistanceKm: roundDistance(toCustomer.distanceKm),
        points: toCustomer.points,
        geometry: toCustomer.geometry,
        source: toCustomer.source,
      };
    }

    if (!restaurantCoordinates) {
      const direct = await this.routing.getRoute(position, destinationCoordinates, vehicle);
      return {
        etaMinutes: direct.durationMinutes + HANDOVER_BUFFER_MINUTES,
        remainingDistanceKm: roundDistance(direct.distanceKm),
        points: direct.points,
        geometry: direct.geometry,
        source: direct.source,
      };
    }

    const toRestaurant = await this.routing.getRoute(position, restaurantCoordinates, vehicle);
    const finalLeg =
      toCustomer ??
      (await this.routing.getRoute(restaurantCoordinates, destinationCoordinates, vehicle));

    // Preparation and driver travel happen in parallel, so the pickup is ready
    // after the longer of the two — not after their sum.
    const readyInMinutes =
      Math.max(toRestaurant.durationMinutes, prepRemaining) + PICKUP_BUFFER_MINUTES;

    return {
      etaMinutes: readyInMinutes + finalLeg.durationMinutes,
      remainingDistanceKm: roundDistance(
        toRestaurant.distanceKm + finalLeg.distanceKm,
      ),
      points: [...toRestaurant.points, ...finalLeg.points],
      geometry: mergeGeometry([toRestaurant.geometry, finalLeg.geometry]),
      source: mergeSource([toRestaurant.source, finalLeg.source]),
    };
  }

  /** Remaining kitchen time, measured from the last order status change. */
  private remainingPrepMinutes(order: OrderDocument, now: Date): number {
    if (order.status === OrderStatus.READY || order.status === OrderStatus.COMPLETED) {
      return 0;
    }

    if (order.status === OrderStatus.PREPARING) {
      const startedAt = (order.updatedAt ?? order.placedAt ?? now).getTime();
      const elapsed = Math.max(0, (now.getTime() - startedAt) / 60_000);
      return Math.max(2, Math.round(DEFAULT_PREP_MINUTES - elapsed));
    }

    if (order.status === OrderStatus.PENDING) return DEFAULT_PREP_MINUTES + 5;
    return DEFAULT_PREP_MINUTES;
  }

  private mapDriverLocation(
    delivery: DeliveryDocument | null,
    driver: DriverProfileDocument | null,
  ): TrackingSnapshotResponse['driverLocation'] {
    if (
      delivery?.driverLocation &&
      delivery.status !== DeliveryStatus.DELIVERED &&
      delivery.status !== DeliveryStatus.CANCELLED
    ) {
      return {
        driverId: delivery.driverId ? delivery.driverId.toString() : '',
        deliveryId: delivery._id.toString(),
        lat: delivery.driverLocation.lat,
        lng: delivery.driverLocation.lng,
        ...(delivery.driverLocation.heading !== undefined
          ? { heading: delivery.driverLocation.heading }
          : {}),
        ...(delivery.driverLocation.speedKph !== undefined
          ? { speedKph: delivery.driverLocation.speedKph }
          : {}),
        updatedAt: delivery.driverLocation.updatedAt.toISOString(),
      };
    }

    if (
      driver?.lastLocation &&
      delivery?.status !== DeliveryStatus.DELIVERED &&
      delivery?.status !== DeliveryStatus.CANCELLED
    ) {
      return {
        driverId: driver._id.toString(),
        ...(delivery ? { deliveryId: delivery._id.toString() } : {}),
        lat: driver.lastLocation.lat,
        lng: driver.lastLocation.lng,
        ...(driver.lastLocation.heading !== undefined
          ? { heading: driver.lastLocation.heading }
          : {}),
        ...(driver.lastLocation.speedKph !== undefined
          ? { speedKph: driver.lastLocation.speedKph }
          : {}),
        updatedAt: driver.lastLocation.updatedAt.toISOString(),
      };
    }

    return null;
  }

  private async assertCanView(
    actor: AuthenticatedUser,
    order: OrderDocument,
    delivery: DeliveryDocument | null,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;

    if (actor.role === UserRole.CUSTOMER && order.customerId.toString() === actor.id) {
      return;
    }

    if (
      actor.role === UserRole.RESTAURANT_OWNER &&
      actor.restaurantId &&
      order.restaurantId.toString() === actor.restaurantId
    ) {
      return;
    }

    if (
      actor.role === UserRole.DRIVER &&
      actor.driverId &&
      delivery?.driverId?.toString() === actor.driverId
    ) {
      return;
    }

    throw new ForbiddenException({
      code: 'forbidden',
      message: 'You do not have access to this tracking snapshot.',
    });
  }
}
