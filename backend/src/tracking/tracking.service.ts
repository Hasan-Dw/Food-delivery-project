import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeliveryStatus } from '../common/enums/delivery.enum';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Delivery, type DeliveryDocument } from '../deliveries/schemas/delivery.schema';
import { toDriverResponse } from '../drivers/interfaces/driver-response.interface';
import { Order, type OrderDocument } from '../orders/schemas/order.schema';
import {
  Restaurant,
  type RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import { DriverProfile, type DriverProfileDocument } from '../users/schemas/driver-profile.schema';
import { User, type UserDocument } from '../users/schemas/user.schema';

interface Coordinates {
  lat: number;
  lng: number;
}

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
  etaMinutes: number;
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
  };
  progress: number;
  lastUpdated: string;
  /** Phase 2 exposes a snapshot only; real-time GPS is Phase 3. */
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

function roundDistance(points: Coordinates[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += haversine(points[index - 1]!, points[index]!);
  }
  return Math.round(total * 10) / 10;
}

function haversine(a: Coordinates, b: Coordinates): number {
  const radius = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

@Injectable()
export class TrackingService {
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
  ) {}

  async getSnapshot(
    actor: AuthenticatedUser,
    orderId: string,
  ): Promise<TrackingSnapshotResponse> {
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

    const delivery = await this.deliveryModel.findOne({ orderId: order._id }).exec();
    await this.assertCanView(actor, order, delivery);

    const restaurant = await this.restaurantModel
      .findById(order.restaurantId)
      .exec();

    const restaurantCoordinates =
      restaurant?.address?.coordinates ?? order.deliveryAddress.coordinates ?? null;
    const destinationCoordinates =
      order.deliveryAddress.coordinates ?? restaurantCoordinates ?? { lat: 0, lng: 0 };

    const driver = delivery?.driverId
      ? await this.driverModel.findById(delivery.driverId).exec()
      : null;
    const driverUser =
      driver ? await this.userModel.findById(driver.userId).exec() : null;

    const deliveryStatus =
      (delivery?.status as DeliveryStatus | undefined) ??
      DeliveryStatus.PENDING_ASSIGNMENT;

    const driverLocation = this.mapDriverLocation(delivery, driver);
    const now = Date.now();
    const etaMinutes = this.resolveEtaMinutes(delivery, deliveryStatus, now);

    const points: Coordinates[] = [];
    if (driverLocation) points.push({ lat: driverLocation.lat, lng: driverLocation.lng });
    if (restaurantCoordinates) points.push(restaurantCoordinates);
    points.push(destinationCoordinates);

    const lastUpdated =
      delivery?.updatedAt ?? order.updatedAt ?? order.placedAt ?? new Date();

    const snapshot: TrackingSnapshotResponse = {
      orderId: order._id.toString(),
      orderStatus: order.status,
      deliveryStatus,
      driverLocation,
      etaMinutes,
      destination: {
        label: order.deliveryAddress.label,
        address: [
          order.deliveryAddress.line1,
          order.deliveryAddress.city,
          order.deliveryAddress.state,
        ]
          .filter(Boolean)
          .join(', '),
        coordinates: destinationCoordinates,
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
        points,
        distanceKm: roundDistance(points),
      },
      progress: PROGRESS_BY_STATUS[deliveryStatus] ?? 0,
      lastUpdated: lastUpdated.toISOString(),
      live: false,
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
      if (deliveryStatus === DeliveryStatus.DELIVERED || deliveryStatus === DeliveryStatus.CANCELLED) {
        snapshot.driverLocation = null;
      }
    }

    return snapshot;
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

  private resolveEtaMinutes(
    delivery: DeliveryDocument | null,
    status: DeliveryStatus,
    now: number,
  ): number {
    if (status === DeliveryStatus.DELIVERED) return 0;
    if (status === DeliveryStatus.CANCELLED) return 0;
    if (delivery?.estimatedArrivalAt) {
      return Math.max(
        0,
        Math.round((delivery.estimatedArrivalAt.getTime() - now) / 60_000),
      );
    }
    return 25;
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
