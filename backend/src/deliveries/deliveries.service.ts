import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  AssignmentSource,
  AutoAssignmentStatus,
  AutoAssignmentTrigger,
  DeliveryAction,
  DeliveryAssignmentAction,
  DeliveryStatus,
  canReleaseAssignment,
  canTransitionDeliveryStatus,
} from '../common/enums/delivery.enum';
import { OrderStatus } from '../common/enums/order.enum';
import { AccountStatus, DriverAvailability, UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  estimateTravelMinutes,
  haversineDistanceKm,
  serviceAreasCompatible,
} from '../common/utils/geo.util';
import { Order, type OrderDocument } from '../orders/schemas/order.schema';
import {
  Restaurant,
  type RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import { DriverProfile, type DriverProfileDocument } from '../users/schemas/driver-profile.schema';
import { User, type UserDocument } from '../users/schemas/user.schema';
import type {
  AutoAssignDeliveryDto,
  CreateDeliveryDto,
  DeliveryLocationDto,
} from './dto/delivery.dto';
import { toDeliveryResponse, type DeliveryResponse } from './delivery.mapper';
import { Delivery, type DeliveryDocument } from './schemas/delivery.schema';

export const AUTO_ASSIGNMENT_COOLDOWN_MS = 15_000;
export const MAX_AUTOMATIC_ATTEMPTS = 5;

const ACTIVE_DELIVERY_STATUSES = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.ON_THE_WAY,
];

export interface AutoAssignmentResult {
  assigned: boolean;
  deliveryId: string;
  status: string;
  reason?: string;
  driverId?: string;
  driverName?: string;
  distanceKm?: number | null;
  etaMinutes?: number | null;
}

interface RankedDriver {
  driver: DriverProfileDocument;
  name: string;
  distanceKm: number | null;
  etaMinutes: number | null;
  recentAssignments: number;
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    @InjectModel(Delivery.name)
    private readonly deliveryModel: Model<DeliveryDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(DriverProfile.name)
    private readonly driverModel: Model<DriverProfileDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
  ) {}

  /**
   * Create the delivery for a freshly placed order. Safe to call more than once
   * per order; the order id is unique on the delivery.
   */
  async ensureForOrder(order: OrderDocument): Promise<DeliveryDocument> {
    const existing = await this.deliveryModel.findOne({ orderId: order._id }).exec();
    if (existing) return existing;

    try {
      return await this.deliveryModel.create({
        orderId: order._id,
        driverId: null,
        restaurantId: order.restaurantId,
        customerId: order.customerId,
        status: DeliveryStatus.PENDING_ASSIGNMENT,
        driverLocation: null,
        assignmentHistory: [],
      });
    } catch (error) {
      if (isDuplicateKey(error)) {
        const duplicate = await this.deliveryModel.findOne({ orderId: order._id }).exec();
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }

  /** Idempotent checkout endpoint used by the customer flow. */
  async createForOrder(
    actor: AuthenticatedUser,
    dto: CreateDeliveryDto,
  ): Promise<DeliveryResponse> {
    const order = await this.orderModel.findById(dto.orderId).exec();
    if (!order) {
      throw new NotFoundException({
        code: 'order_not_found',
        message: 'That order could not be found.',
      });
    }

    if (order.customerId.toString() !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'You can only create a delivery for your own order.',
      });
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED
    ) {
      throw new ConflictException({
        code: 'order_closed',
        message: 'A closed order cannot receive a delivery.',
      });
    }

    const delivery = await this.ensureForOrder(order);
    return toDeliveryResponse(delivery);
  }

  async list(actor: AuthenticatedUser): Promise<DeliveryResponse[]> {
    const filter: FilterQuery<DeliveryDocument> = {};

    if (actor.role === UserRole.CUSTOMER) {
      filter.customerId = new Types.ObjectId(actor.id);
    } else if (actor.role === UserRole.RESTAURANT_OWNER) {
      if (!actor.restaurantId) return [];
      filter.restaurantId = new Types.ObjectId(actor.restaurantId);
    } else if (actor.role === UserRole.DRIVER) {
      if (!actor.driverId) return [];
      filter.driverId = new Types.ObjectId(actor.driverId);
    } else if (actor.role !== UserRole.ADMIN) {
      return [];
    }

    const deliveries = await this.deliveryModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(200)
      .exec();

    return deliveries.map(toDeliveryResponse);
  }

  async getById(actor: AuthenticatedUser, deliveryId: string): Promise<DeliveryResponse> {
    const delivery = await this.getDocument(deliveryId);
    this.assertCanView(actor, delivery);
    return toDeliveryResponse(delivery);
  }

  async getByOrderId(
    actor: AuthenticatedUser,
    orderId: string,
  ): Promise<DeliveryResponse> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException({
        code: 'delivery_not_found',
        message: 'That delivery could not be found.',
      });
    }

    const delivery = await this.deliveryModel
      .findOne({ orderId: new Types.ObjectId(orderId) })
      .exec();
    if (!delivery) {
      throw new NotFoundException({
        code: 'delivery_not_found',
        message: 'That delivery could not be found.',
      });
    }

    this.assertCanView(actor, delivery);
    return toDeliveryResponse(delivery);
  }

  async getActiveForDriver(
    actor: AuthenticatedUser,
    requestedDriverId?: string,
  ): Promise<DeliveryResponse | null> {
    let driverId = requestedDriverId;

    if (actor.role === UserRole.DRIVER) {
      if (!actor.driverId) return null;
      if (requestedDriverId && requestedDriverId !== actor.driverId) {
        throw new ForbiddenException({
          code: 'forbidden',
          message: 'You can only view your own active delivery.',
        });
      }
      driverId = actor.driverId;
    } else if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Only drivers and administrators can view active deliveries.',
      });
    }

    if (!driverId || !Types.ObjectId.isValid(driverId)) return null;

    const delivery = await this.deliveryModel
      .findOne({
        driverId: new Types.ObjectId(driverId),
        status: { $in: ACTIVE_DELIVERY_STATUSES },
      })
      .sort({ updatedAt: -1 })
      .exec();

    return delivery ? toDeliveryResponse(delivery) : null;
  }

  async assign(
    actor: AuthenticatedUser,
    deliveryId: string,
    driverId: string,
    reason?: string,
  ): Promise<DeliveryResponse> {
    const delivery = await this.getDocument(deliveryId);
    if (delivery.status !== DeliveryStatus.PENDING_ASSIGNMENT || delivery.driverId) {
      throw new ConflictException({
        code: 'delivery_not_assignable',
        message: 'This delivery is no longer awaiting assignment.',
      });
    }

    const order = await this.getOrderForDelivery(delivery);
    this.assertOrderAcceptsDelivery(order);

    const driver = await this.getDriver(driverId);
    const restaurant = await this.restaurantModel
      .findById(delivery.restaurantId)
      .exec();
    this.assertDriverAssignable(driver, restaurant);

    const result = await this.attachDriver({
      deliveryId,
      order,
      driver,
      source: AssignmentSource.MANUAL,
      adminId: actor.id,
      reason: reason ?? 'Manual assignment by platform operations.',
    });

    if (!result) {
      throw new ConflictException({
        code: 'delivery_not_assignable',
        message: 'The delivery or driver changed while assigning. Refresh and try again.',
      });
    }

    return toDeliveryResponse(result);
  }

  async autoAssign(
    actor: AuthenticatedUser,
    deliveryId: string,
    dto: AutoAssignDeliveryDto = {},
  ): Promise<AutoAssignmentResult> {
    const trigger = dto.trigger ?? AutoAssignmentTrigger.ADMIN_RETRY;
    const force = dto.force ?? trigger === AutoAssignmentTrigger.ADMIN_RETRY;

    return this.attemptAutomaticAssignment(deliveryId, {
      trigger,
      adminId: actor.id,
      excludeDriverIds: dto.excludeDriverIds ?? [],
      force,
      reason: dto.reason,
    });
  }

  /** Called by the order lifecycle when an order becomes READY. */
  async autoAssignForOrder(orderId: string): Promise<AutoAssignmentResult | null> {
    if (!Types.ObjectId.isValid(orderId)) return null;

    const delivery = await this.deliveryModel
      .findOne({ orderId: new Types.ObjectId(orderId) })
      .exec();
    if (!delivery) return null;

    return this.attemptAutomaticAssignment(delivery._id.toString(), {
      trigger: AutoAssignmentTrigger.ORDER_READY,
      force: false,
    });
  }

  async unassign(
    actor: AuthenticatedUser,
    deliveryId: string,
    reason: string,
  ): Promise<DeliveryResponse> {
    const delivery = await this.getDocument(deliveryId);

    if (!canReleaseAssignment(delivery.status as DeliveryStatus)) {
      throw new ConflictException({
        code: 'delivery_not_unassignable',
        message:
          delivery.status === DeliveryStatus.PICKED_UP ||
          delivery.status === DeliveryStatus.ON_THE_WAY
            ? 'The food is already with the driver and requires an exceptional handover.'
            : 'Only an assigned delivery can be unassigned.',
      });
    }

    if (!delivery.driverId) {
      throw new ConflictException({
        code: 'driver_required',
        message: 'This delivery has no assigned driver to release.',
      });
    }

    const order = await this.getOrderForDelivery(delivery);
    this.assertOrderAcceptsDelivery(order);

    const previousDriverId = delivery.driverId;
    const now = new Date();

    const updated = await this.deliveryModel
      .findOneAndUpdate(
        {
          _id: delivery._id,
          status: DeliveryStatus.ASSIGNED,
          driverId: previousDriverId,
        },
        {
          $set: {
            status: DeliveryStatus.PENDING_ASSIGNMENT,
            driverId: null,
            driverLocation: null,
          },
          $unset: { assignedAt: '', estimatedArrivalAt: '', pickedUpAt: '' },
          $push: {
            assignmentHistory: {
              action: DeliveryAssignmentAction.UNASSIGNED,
              source: AssignmentSource.MANUAL,
              previousDriverId,
              newDriverId: null,
              driverId: previousDriverId,
              driverName: await this.driverName(previousDriverId),
              adminId: new Types.ObjectId(actor.id),
              reason,
              at: now,
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException({
        code: 'delivery_assignment_changed',
        message: 'The delivery changed while unassigning. Refresh and try again.',
      });
    }

    await this.releaseDriver(previousDriverId, delivery._id);

    // The order remains active; a released driver should not bounce straight
    // back, so attempt a replacement that excludes them.
    try {
      await this.attemptAutomaticAssignment(delivery._id.toString(), {
        trigger: AutoAssignmentTrigger.AFTER_UNASSIGN,
        adminId: actor.id,
        excludeDriverIds: [previousDriverId.toString()],
        force: true,
        reason: `Automatic replacement after unassignment: ${reason}`,
      });
    } catch (error) {
      this.logger.warn(
        `Replacement assignment failed after unassign: ${(error as Error).message}`,
      );
    }

    const refreshed = await this.getDocument(deliveryId);
    return toDeliveryResponse(refreshed);
  }

  async reassign(
    actor: AuthenticatedUser,
    deliveryId: string,
    driverId: string,
    reason: string,
  ): Promise<DeliveryResponse> {
    const delivery = await this.getDocument(deliveryId);

    if (delivery.status !== DeliveryStatus.ASSIGNED || !delivery.driverId) {
      throw new ConflictException({
        code: 'delivery_not_reassignable',
        message: 'Only an assigned, not-yet-picked-up delivery can be reassigned.',
      });
    }

    if (delivery.driverId.toString() === driverId) {
      throw new ConflictException({
        code: 'driver_already_assigned',
        message: 'That driver is already assigned to this delivery.',
      });
    }

    const order = await this.getOrderForDelivery(delivery);
    this.assertOrderAcceptsDelivery(order);

    const driver = await this.getDriver(driverId);
    const restaurant = await this.restaurantModel
      .findById(delivery.restaurantId)
      .exec();
    this.assertDriverAssignable(driver, restaurant);

    const reserved = await this.reserveDriver(driver, delivery._id);
    if (!reserved) {
      throw new ConflictException({
        code: 'driver_unavailable',
        message: 'That driver became unavailable while reassigning.',
      });
    }

    const now = new Date();
    const previousDriverId = delivery.driverId;
    const { estimatedArrivalAt, location } = this.computeEta(driver, restaurant, now);

    const updated = await this.deliveryModel
      .findOneAndUpdate(
        {
          _id: delivery._id,
          status: DeliveryStatus.ASSIGNED,
          driverId: previousDriverId,
        },
        {
          $set: {
            driverId: driver._id,
            assignedAt: now,
            estimatedArrivalAt,
            driverLocation: location,
          },
          $push: {
            assignmentHistory: {
              action: DeliveryAssignmentAction.REASSIGNED,
              source: AssignmentSource.MANUAL,
              previousDriverId,
              newDriverId: driver._id,
              driverId: driver._id,
              driverName: await this.driverName(driver._id),
              adminId: new Types.ObjectId(actor.id),
              reason,
              at: now,
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      await this.releaseDriver(driver._id, delivery._id);
      throw new ConflictException({
        code: 'delivery_assignment_changed',
        message: 'The delivery changed while reassigning. Refresh and try again.',
      });
    }

    await this.releaseDriver(previousDriverId, delivery._id);
    return toDeliveryResponse(updated);
  }

  async transition(
    actor: AuthenticatedUser,
    deliveryId: string,
    action: DeliveryAction,
  ): Promise<DeliveryResponse> {
    if (action === DeliveryAction.ASSIGN) {
      throw new BadRequestException({
        code: 'assignment_required',
        message: 'Use the assignment endpoint to choose a driver.',
      });
    }

    const delivery = await this.getDocument(deliveryId);
    const order = await this.getOrderForDelivery(delivery);

    if (actor.role === UserRole.DRIVER) {
      if (!actor.driverId || delivery.driverId?.toString() !== actor.driverId) {
        throw new ForbiddenException({
          code: 'forbidden',
          message: 'This delivery is not assigned to you.',
        });
      }
      if (action === DeliveryAction.CANCEL) {
        throw new ForbiddenException({
          code: 'forbidden',
          message: 'Contact platform operations to release an assignment.',
        });
      }
    } else if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Your account cannot advance deliveries.',
      });
    }

    if (action === DeliveryAction.CANCEL) {
      return this.cancelDelivery(delivery, actor.id, 'Cancelled by platform operations.');
    }

    if (action === DeliveryAction.PICK_UP && order.status !== OrderStatus.READY) {
      throw new ConflictException({
        code: 'order_not_ready',
        message: 'The restaurant must mark this order ready before pickup.',
      });
    }

    if (action === DeliveryAction.DELIVER) {
      if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
        throw new ConflictException({
          code: 'order_closed',
          message: 'A delivery cannot be completed for a closed order.',
        });
      }
      if (order.status === OrderStatus.COMPLETED) {
        throw new ConflictException({
          code: 'order_already_completed',
          message: 'This order has already been completed.',
        });
      }
    }

    const target = this.targetStatus(action);
    if (!canTransitionDeliveryStatus(delivery.status as DeliveryStatus, target)) {
      throw new ConflictException({
        code: 'invalid_delivery_transition',
        message: `A delivery in ${delivery.status} cannot transition to ${target}.`,
      });
    }

    const now = new Date();
    const stamp =
      target === DeliveryStatus.PICKED_UP
        ? { pickedUpAt: now }
        : target === DeliveryStatus.DELIVERED
          ? { deliveredAt: now }
          : {};

    const updated = await this.deliveryModel
      .findOneAndUpdate(
        {
          _id: delivery._id,
          status: delivery.status,
          driverId: delivery.driverId,
        },
        {
          $set: { status: target, ...stamp },
          ...(target === DeliveryStatus.DELIVERED
            ? { $unset: { estimatedArrivalAt: '' } }
            : {}),
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException({
        code: 'delivery_changed',
        message: 'The delivery changed while advancing it. Refresh and try again.',
      });
    }

    if (target === DeliveryStatus.DELIVERED) {
      try {
        await this.completeOrder(order, actor.id, now);
      } catch (error) {
        // Roll the delivery back so the order and delivery cannot disagree.
        await this.deliveryModel
          .updateOne(
            { _id: delivery._id, status: DeliveryStatus.DELIVERED },
            {
              $set: { status: DeliveryStatus.ON_THE_WAY },
              $unset: { deliveredAt: '' },
            },
          )
          .exec();
        throw error;
      }

      if (delivery.driverId) {
        await this.releaseDriver(delivery.driverId, delivery._id, true);
      }
    }

    const refreshed = await this.getDocument(deliveryId);
    return toDeliveryResponse(refreshed);
  }

  async updateLocation(
    actor: AuthenticatedUser,
    deliveryId: string,
    input: DeliveryLocationDto,
  ): Promise<DeliveryResponse> {
    const delivery = await this.getDocument(deliveryId);
    if (!delivery.driverId) {
      throw new ConflictException({
        code: 'driver_required',
        message: 'This delivery has no assigned driver.',
      });
    }

    if (!ACTIVE_DELIVERY_STATUSES.includes(delivery.status as DeliveryStatus)) {
      throw new ConflictException({
        code: 'delivery_not_active',
        message: 'Location updates are only accepted while a delivery is active.',
      });
    }

    if (
      actor.role === UserRole.DRIVER &&
      delivery.driverId.toString() !== actor.driverId
    ) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'This delivery is not assigned to you.',
      });
    }
    if (actor.role !== UserRole.DRIVER && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Only the assigned driver can publish a location.',
      });
    }

    const updatedAt = new Date();
    const location = {
      lat: input.lat,
      lng: input.lng,
      ...(input.heading !== undefined ? { heading: input.heading } : {}),
      ...(input.speedKph !== undefined ? { speedKph: input.speedKph } : {}),
      updatedAt,
    };

    const updated = await this.deliveryModel
      .findOneAndUpdate(
        {
          _id: delivery._id,
          driverId: delivery.driverId,
          status: { $in: ACTIVE_DELIVERY_STATUSES },
        },
        { $set: { driverLocation: location } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException({
        code: 'delivery_changed',
        message: 'The delivery is no longer active.',
      });
    }

    await this.driverModel
      .updateOne({ _id: delivery.driverId }, { $set: { lastLocation: location } })
      .exec();

    return toDeliveryResponse(updated);
  }

  /** Cancels the transportation only. The order lifecycle is owned elsewhere. */
  async cancelForOrder(
    orderId: string,
    reason: string,
    actorId?: string,
  ): Promise<DeliveryDocument | null> {
    if (!Types.ObjectId.isValid(orderId)) return null;

    const delivery = await this.deliveryModel
      .findOne({ orderId: new Types.ObjectId(orderId) })
      .exec();
    if (!delivery) return null;
    if (
      delivery.status === DeliveryStatus.CANCELLED ||
      delivery.status === DeliveryStatus.DELIVERED
    ) {
      return delivery;
    }

    try {
      const cancelled = await this.cancelDelivery(
        delivery,
        actorId ?? delivery.customerId.toString(),
        reason,
      );
      return await this.deliveryModel.findById(cancelled.id).exec();
    } catch (error) {
      // Cancelling an order must not fail because the transportation record
      // changed at the same instant. Log it and let the order transition stand.
      this.logger.warn(
        `Could not cancel delivery for order ${orderId}: ${(error as Error).message}`,
      );
      return delivery;
    }
  }

  async getDocument(deliveryId: string): Promise<DeliveryDocument> {
    if (!Types.ObjectId.isValid(deliveryId)) {
      throw new NotFoundException({
        code: 'delivery_not_found',
        message: 'That delivery could not be found.',
      });
    }

    const delivery = await this.deliveryModel.findById(deliveryId).exec();
    if (!delivery) {
      throw new NotFoundException({
        code: 'delivery_not_found',
        message: 'That delivery could not be found.',
      });
    }
    return delivery;
  }

  /* ── internal helpers ─────────────────────────────────────────────────── */

  private async attemptAutomaticAssignment(
    deliveryId: string,
    options: {
      trigger: AutoAssignmentTrigger;
      adminId?: string;
      excludeDriverIds?: string[];
      force?: boolean;
      reason?: string;
    },
  ): Promise<AutoAssignmentResult> {
    const skipped = (reason: string): AutoAssignmentResult => ({
      assigned: false,
      deliveryId,
      status: AutoAssignmentStatus.SKIPPED,
      reason,
    });

    if (!Types.ObjectId.isValid(deliveryId)) {
      return skipped('Delivery not found.');
    }

    const delivery = await this.deliveryModel.findById(deliveryId).exec();
    if (!delivery) return skipped('Delivery not found.');

    if (
      delivery.status !== DeliveryStatus.PENDING_ASSIGNMENT ||
      delivery.driverId
    ) {
      return skipped('Delivery is no longer awaiting assignment.');
    }

    const order = await this.orderModel.findById(delivery.orderId).exec();
    if (!order) return skipped('The related order no longer exists.');
    if (order.status !== OrderStatus.READY) {
      return skipped('Automatic assignment waits until the order is ready.');
    }

    const previous = delivery.autoAssignment;
    const attempts = previous?.attempts ?? 0;
    const isAutomaticTrigger =
      !options.force && options.trigger !== AutoAssignmentTrigger.ADMIN_RETRY;
    const lastAttemptMs = previous?.lastAttemptAt
      ? previous.lastAttemptAt.getTime()
      : 0;

    if (
      isAutomaticTrigger &&
      lastAttemptMs &&
      Date.now() - lastAttemptMs < AUTO_ASSIGNMENT_COOLDOWN_MS
    ) {
      return {
        assigned: false,
        deliveryId,
        status: AutoAssignmentStatus.COOLDOWN,
        reason: 'An automatic attempt just ran; retry after the cooldown.',
      };
    }

    if (isAutomaticTrigger && attempts >= MAX_AUTOMATIC_ATTEMPTS) {
      const reason =
        'Automatic retry limit reached. An administrator can retry explicitly.';
      await this.persistAutoAssignment(delivery._id, attempts, AutoAssignmentStatus.EXHAUSTED, options.trigger, reason);
      return {
        assigned: false,
        deliveryId,
        status: AutoAssignmentStatus.EXHAUSTED,
        reason,
      };
    }

    const restaurant = await this.restaurantModel
      .findById(delivery.restaurantId)
      .exec();
    const candidates = await this.rankCandidates(
      restaurant,
      options.excludeDriverIds ?? [],
    );

    const excluded = new Set(options.excludeDriverIds ?? []);
    for (const candidate of candidates) {
      if (excluded.has(candidate.driver._id.toString())) continue;

      const result = await this.attachDriver({
        deliveryId: delivery._id.toString(),
        order,
        driver: candidate.driver,
        source: AssignmentSource.AUTOMATIC,
        adminId: options.adminId,
        reason:
          options.reason ??
          `Automatic assignment — ${this.candidateRationale(candidate)}`,
      });

      if (!result) continue;

      await this.persistAutoAssignment(
        delivery._id,
        attempts + 1,
        AutoAssignmentStatus.ASSIGNED,
        options.trigger,
        options.reason ?? `Automatic assignment — ${this.candidateRationale(candidate)}`,
        candidate,
      );

      return {
        assigned: true,
        deliveryId,
        status: AutoAssignmentStatus.ASSIGNED,
        reason: options.reason ?? `Automatic assignment — ${this.candidateRationale(candidate)}`,
        driverId: candidate.driver._id.toString(),
        driverName: candidate.name,
        distanceKm: candidate.distanceKm,
        etaMinutes: candidate.etaMinutes,
      };
    }

    const reason = restaurant
      ? `No approved, available driver in ${restaurant.address?.city ?? 'this area'} is free right now.`
      : 'No approved, available driver is free right now.';

    await this.persistAutoAssignment(
      delivery._id,
      attempts + 1,
      AutoAssignmentStatus.NO_ELIGIBLE_DRIVER,
      options.trigger,
      reason,
    );

    return {
      assigned: false,
      deliveryId,
      status: AutoAssignmentStatus.NO_ELIGIBLE_DRIVER,
      reason,
    };
  }

  private async attachDriver(input: {
    deliveryId: string;
    order: OrderDocument;
    driver: DriverProfileDocument;
    source: AssignmentSource;
    adminId?: string;
    reason: string;
  }): Promise<DeliveryDocument | null> {
    const restaurant = await this.restaurantModel
      .findById(input.order.restaurantId)
      .exec();

    const reserved = await this.reserveDriver(input.driver, new Types.ObjectId(input.deliveryId));
    if (!reserved) return null;

    const now = new Date();
    const { estimatedArrivalAt, location } = this.computeEta(
      input.driver,
      restaurant,
      now,
    );

    try {
      return await this.deliveryModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(input.deliveryId),
            status: DeliveryStatus.PENDING_ASSIGNMENT,
            driverId: null,
          },
          {
            $set: {
              status: DeliveryStatus.ASSIGNED,
              driverId: input.driver._id,
              assignedAt: now,
              estimatedArrivalAt,
              driverLocation: location,
            },
            $push: {
              assignmentHistory: {
                action: DeliveryAssignmentAction.ASSIGNED,
                source: input.source,
                previousDriverId: null,
                newDriverId: input.driver._id,
                driverId: input.driver._id,
                driverName: await this.driverName(input.driver._id),
                adminId: input.adminId
                  ? new Types.ObjectId(input.adminId)
                  : null,
                reason: input.reason,
                at: now,
              },
            },
          },
          { new: true },
        )
        .exec();
    } finally {
      // A failed compare-and-set means someone else claimed the delivery; the
      // reserved driver must be released so they are not stuck ON_DELIVERY.
      const delivery = await this.deliveryModel
        .findById(input.deliveryId)
        .select('driverId status')
        .exec();
      if (!delivery || delivery.driverId?.toString() !== input.driver._id.toString()) {
        await this.releaseDriver(input.driver._id, new Types.ObjectId(input.deliveryId));
      }
    }
  }

  private async reserveDriver(
    driver: DriverProfileDocument,
    deliveryId: Types.ObjectId,
  ): Promise<boolean> {
    const updated = await this.driverModel
      .findOneAndUpdate(
        {
          _id: driver._id,
          accountStatus: AccountStatus.APPROVED,
          availability: DriverAvailability.AVAILABLE,
          activeDeliveryId: null,
        },
        {
          $set: {
            availability: DriverAvailability.ON_DELIVERY,
            activeDeliveryId: deliveryId,
          },
        },
        { new: true },
      )
      .exec();

    return Boolean(updated);
  }

  private async releaseDriver(
    driverId: Types.ObjectId,
    deliveryId: Types.ObjectId,
    completed = false,
  ): Promise<void> {
    await this.driverModel
      .updateOne(
        { _id: driverId, activeDeliveryId: deliveryId },
        {
          $set: {
            availability: DriverAvailability.AVAILABLE,
            activeDeliveryId: null,
          },
          ...(completed ? { $inc: { completedDeliveries: 1 } } : {}),
        },
      )
      .exec();
  }

  private async cancelDelivery(
    delivery: DeliveryDocument,
    actorId: string,
    reason: string,
  ): Promise<DeliveryResponse> {
    const now = new Date();
    const releasedDriverId = delivery.driverId;

    const updated = await this.deliveryModel
      .findOneAndUpdate(
        { _id: delivery._id, status: delivery.status },
        {
          $set: {
            status: DeliveryStatus.CANCELLED,
            cancelledAt: now,
            driverLocation: null,
          },
          $unset: { estimatedArrivalAt: '' },
          $push: {
            assignmentHistory: {
              action: DeliveryAssignmentAction.UNASSIGNED,
              source: AssignmentSource.MANUAL,
              previousDriverId: releasedDriverId ?? null,
              newDriverId: null,
              driverId: releasedDriverId ?? null,
              driverName: releasedDriverId
                ? await this.driverName(releasedDriverId)
                : null,
              adminId: Types.ObjectId.isValid(actorId)
                ? new Types.ObjectId(actorId)
                : null,
              reason,
              at: now,
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException({
        code: 'delivery_changed',
        message: 'The delivery changed while cancelling. Refresh and try again.',
      });
    }

    if (releasedDriverId) {
      await this.releaseDriver(releasedDriverId, delivery._id);
    }

    return toDeliveryResponse(updated);
  }

  private async completeOrder(
    order: OrderDocument,
    actorId: string,
    completedAt: Date,
  ): Promise<void> {
    const updated = await this.orderModel
      .findOneAndUpdate(
        {
          _id: order._id,
          status: {
            $nin: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED],
          },
        },
        {
          $set: { status: OrderStatus.COMPLETED, completedAt },
          $push: {
            statusHistory: {
              status: OrderStatus.COMPLETED,
              at: completedAt,
              ...(Types.ObjectId.isValid(actorId)
                ? { byUserId: new Types.ObjectId(actorId) }
                : {}),
              reason: 'Delivery completed.',
            },
          },
        },
        { new: true },
      )
      .exec();

    if (updated) return;

    const current = await this.orderModel.findById(order._id).select('status').exec();
    if (current?.status === OrderStatus.COMPLETED) return;

    throw new ConflictException({
      code: 'order_closed',
      message: 'A delivery cannot be completed for a closed order.',
    });
  }

  private async rankCandidates(
    restaurant: RestaurantDocument | null,
    excludeDriverIds: string[],
  ): Promise<RankedDriver[]> {
    const filter: FilterQuery<DriverProfileDocument> = {
      accountStatus: AccountStatus.APPROVED,
      availability: DriverAvailability.AVAILABLE,
      activeDeliveryId: null,
    };
    if (excludeDriverIds.length > 0) {
      filter._id = {
        $nin: excludeDriverIds.filter((id) => Types.ObjectId.isValid(id)).map(
          (id) => new Types.ObjectId(id),
        ),
      };
    }

    const drivers = await this.driverModel.find(filter).limit(200).exec();
    if (drivers.length === 0) return [];

    const users = await this.userModel
      .find({ _id: { $in: drivers.map((driver) => driver.userId) } })
      .select('fullName')
      .exec();
    const names = new Map(users.map((user) => [user._id.toString(), user.fullName]));

    const counts = await this.assignmentCounts();
    const coordinates = restaurant?.address?.coordinates ?? null;
    const restaurantArea = restaurant?.address?.city ?? null;

    const candidates: RankedDriver[] = [];

    for (const driver of drivers) {
      if (!serviceAreasCompatible(driver.serviceArea, restaurantArea)) continue;

      const location = driver.lastLocation
        ? { lat: driver.lastLocation.lat, lng: driver.lastLocation.lng }
        : null;
      const distanceKm =
        location && coordinates
          ? haversineDistanceKm(coordinates, location)
          : null;
      const etaMinutes =
        distanceKm !== null ? estimateTravelMinutes(distanceKm, driver.vehicle) : null;

      candidates.push({
        driver,
        name: names.get(driver.userId.toString()) ?? 'Driver',
        distanceKm,
        etaMinutes,
        recentAssignments: counts.get(driver._id.toString()) ?? 0,
      });
    }

    return candidates.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm === null) return -1;
      if (a.distanceKm === null && b.distanceKm !== null) return 1;
      if (
        a.distanceKm !== null &&
        b.distanceKm !== null &&
        a.distanceKm !== b.distanceKm
      ) {
        return a.distanceKm - b.distanceKm;
      }
      if (
        a.etaMinutes !== null &&
        b.etaMinutes !== null &&
        a.etaMinutes !== b.etaMinutes
      ) {
        return a.etaMinutes - b.etaMinutes;
      }
      if (a.recentAssignments !== b.recentAssignments) {
        return a.recentAssignments - b.recentAssignments;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private async assignmentCounts(): Promise<Map<string, number>> {
    const deliveries = await this.deliveryModel
      .find({ 'assignmentHistory.0': { $exists: true } })
      .select('assignmentHistory')
      .limit(1000)
      .exec();

    const counts = new Map<string, number>();
    for (const delivery of deliveries) {
      for (const event of delivery.assignmentHistory ?? []) {
        if (event.action === DeliveryAssignmentAction.UNASSIGNED) continue;
        const driverId = event.newDriverId ?? event.driverId;
        if (!driverId) continue;
        const key = driverId.toString();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }

  private async persistAutoAssignment(
    deliveryId: Types.ObjectId,
    attempts: number,
    status: AutoAssignmentStatus,
    trigger: AutoAssignmentTrigger,
    reason?: string,
    candidate?: RankedDriver,
  ): Promise<void> {
    await this.deliveryModel
      .updateOne(
        { _id: deliveryId },
        {
          $set: {
            autoAssignment: {
              attempts,
              lastAttemptAt: new Date(),
              lastTrigger: trigger,
              status,
              ...(reason ? { reason } : {}),
            },
          },
        },
      )
      .exec();

    if (candidate) {
      this.logger.debug(
        `Auto assignment for ${deliveryId.toString()} selected ${candidate.name}.`,
      );
    }
  }

  private computeEta(
    driver: DriverProfileDocument,
    restaurant: RestaurantDocument | null,
    now: Date,
  ): { estimatedArrivalAt: Date; location: { lat: number; lng: number; updatedAt: Date } | null } {
    const coordinates = restaurant?.address?.coordinates ?? null;
    const location = driver.lastLocation
      ? {
          lat: driver.lastLocation.lat,
          lng: driver.lastLocation.lng,
          updatedAt: driver.lastLocation.updatedAt,
        }
      : null;

    let minutes: number;
    if (location && coordinates) {
      const distance = haversineDistanceKm(coordinates, location);
      minutes = estimateTravelMinutes(distance, driver.vehicle);
    } else {
      const estimate = restaurant?.estimatedDeliveryMinutes ?? [25, 40];
      const low = estimate[0] ?? 25;
      const high = estimate[1] ?? low;
      minutes = Math.max(5, Math.round((low + high) / 2));
    }

    return {
      estimatedArrivalAt: new Date(now.getTime() + minutes * 60_000),
      location,
    };
  }

  private async driverName(driverId: Types.ObjectId): Promise<string | null> {
    const driver = await this.driverModel.findById(driverId).select('userId').exec();
    if (!driver) return null;
    const user = await this.userModel
      .findById(driver.userId)
      .select('fullName')
      .exec();
    return user?.fullName ?? null;
  }

  private candidateRationale(candidate: RankedDriver): string {
    return candidate.distanceKm !== null
      ? `${candidate.distanceKm.toFixed(1)} km away · about ${candidate.etaMinutes} min`
      : `Matched by service area${candidate.driver.serviceArea ? ` (${candidate.driver.serviceArea})` : ''}`;
  }

  private targetStatus(action: DeliveryAction): DeliveryStatus {
    switch (action) {
      case DeliveryAction.PICK_UP:
        return DeliveryStatus.PICKED_UP;
      case DeliveryAction.START_TRANSIT:
        return DeliveryStatus.ON_THE_WAY;
      case DeliveryAction.DELIVER:
        return DeliveryStatus.DELIVERED;
      case DeliveryAction.CANCEL:
        return DeliveryStatus.CANCELLED;
      default:
        return DeliveryStatus.ASSIGNED;
    }
  }

  private async getOrderForDelivery(delivery: DeliveryDocument): Promise<OrderDocument> {
    const order = await this.orderModel.findById(delivery.orderId).exec();
    if (!order) {
      throw new NotFoundException({
        code: 'order_not_found',
        message: 'The order for this delivery could not be found.',
      });
    }
    return order;
  }

  private async getDriver(driverId: string): Promise<DriverProfileDocument> {
    if (!Types.ObjectId.isValid(driverId)) {
      throw new NotFoundException({
        code: 'driver_not_found',
        message: 'That driver could not be found.',
      });
    }
    const driver = await this.driverModel.findById(driverId).exec();
    if (!driver) {
      throw new NotFoundException({
        code: 'driver_not_found',
        message: 'That driver could not be found.',
      });
    }
    return driver;
  }

  private assertDriverAssignable(
    driver: DriverProfileDocument,
    restaurant: RestaurantDocument | null,
  ): void {
    if (driver.accountStatus !== AccountStatus.APPROVED) {
      throw new ConflictException({
        code: 'driver_not_approved',
        message: 'That driver is not approved for deliveries.',
      });
    }
    if (driver.availability !== DriverAvailability.AVAILABLE || driver.activeDeliveryId) {
      throw new ConflictException({
        code: 'driver_unavailable',
        message: 'That driver already has an active delivery or is offline.',
      });
    }
    if (
      !serviceAreasCompatible(driver.serviceArea, restaurant?.address?.city ?? null)
    ) {
      throw new ConflictException({
        code: 'driver_outside_service_area',
        message: `That driver operates in ${driver.serviceArea}; this delivery is in ${restaurant?.address?.city ?? 'another area'}.`,
      });
    }
  }

  private assertOrderAcceptsDelivery(order: OrderDocument): void {
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED ||
      order.status === OrderStatus.COMPLETED
    ) {
      throw new ConflictException({
        code: 'order_not_assignable',
        message: `An order in ${order.status} cannot receive a delivery.`,
      });
    }
  }

  private assertCanView(actor: AuthenticatedUser, delivery: DeliveryDocument): void {
    if (actor.role === UserRole.ADMIN) return;
    if (
      actor.role === UserRole.CUSTOMER &&
      delivery.customerId.toString() === actor.id
    ) {
      return;
    }
    if (
      actor.role === UserRole.RESTAURANT_OWNER &&
      actor.restaurantId &&
      delivery.restaurantId.toString() === actor.restaurantId
    ) {
      return;
    }
    if (
      actor.role === UserRole.DRIVER &&
      actor.driverId &&
      delivery.driverId?.toString() === actor.driverId
    ) {
      return;
    }

    throw new ForbiddenException({
      code: 'forbidden',
      message: 'You do not have access to this delivery.',
    });
  }
}
