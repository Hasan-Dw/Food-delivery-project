import type {
  AutoAssignmentTrigger,
  Delivery,
  DeliveryAction,
  DeliveryAutoAssignmentResult,
  DriverLocationInput,
} from '@/types';
import { deliveries } from '@/mocks/data/deliveries';
import { drivers } from '@/mocks/data/drivers';
import { orders } from '@/mocks/data/orders';
import { upsertDriverLocation } from '@/mocks/data/driver-locations';
import {
  canTransitionDeliveryStatus,
  canUnassignDelivery,
  deliveryActionStatus,
  isActiveDeliveryStatus,
} from '@/lib/order-lifecycle';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { DeliveryService } from '@/services/deliveries/DeliveryService';
import {
  attachDriver,
  clearAssignmentFields,
  findDeliveryOrThrow,
  findOrderForDelivery,
  findRestaurantForDelivery,
  pushAssignmentEvent,
  releaseDriver,
  validateDriverForAssignment,
  validateOrderAcceptsDelivery,
} from './delivery-store';
import { attemptAutoAssignment, retryPendingAssignmentsForDriver } from './assignment-engine';

export interface DeliveryAssignmentOptions {
  /** Display-only actor id; a backend must derive this from the session. */
  actorId?: string | null;
}

export interface AutoAssignDeliveryOptions extends DeliveryAssignmentOptions {
  trigger?: AutoAssignmentTrigger;
  excludeDriverIds?: string[];
  force?: boolean;
  reason?: string;
}

function findDriver(driverId: string) {
  const driver = drivers.find((entry) => entry.id === driverId);
  if (!driver) {
    throw new ApiError({ code: 'driver_not_found', message: 'Driver not found.' }, 404);
  }
  return driver;
}

function assertPrePickupAssignment(status: Delivery['status'], action: 'unassign' | 'reassign'): void {
  if (status === 'PICKED_UP' || status === 'ON_THE_WAY') {
    throw new ApiError(
      {
        code: 'handover_required',
        message:
          'The food has already left the restaurant. A normal reassignment would lose custody, so an exceptional handover workflow is required.',
      },
      409,
    );
  }

  if (status === 'CANCELLED') {
    throw new ApiError(
      {
        code: 'delivery_cancelled',
        message: `A cancelled delivery cannot be ${action === 'unassign' ? 'returned to the pool' : 'reassigned'}.`,
      },
      409,
    );
  }

  if (!canUnassignDelivery(status)) {
    throw new ApiError(
      {
        code: 'delivery_not_reassignable',
        message:
          action === 'unassign'
            ? 'Only a delivery that is assigned but not yet picked up can be unassigned.'
            : 'Only a delivery that is assigned but not yet picked up can be reassigned.',
      },
      409,
    );
  }
}

/**
 * Demo delivery system. Assignment is deliberately platform-side: there is no
 * restaurant-owned driver path, and a driver cannot hold two active deliveries.
 *
 * Automatic assignment is idempotent and bounded. Unassign/reassign are
 * separate operations from cancellation; they release the driver, return the
 * delivery to the assignment pool and leave the customer's order active.
 * In-transit custody is never silently rewound: it raises `handover_required`
 * until a dedicated handover model exists.
 */
export class MockDeliveryService implements DeliveryService {
  async list(): Promise<Delivery[]> {
    await delay(320);
    return [...deliveries];
  }

  async getById(deliveryId: string): Promise<Delivery> {
    await delay(220);
    return findDeliveryOrThrow(deliveryId);
  }

  async getByOrderId(orderId: string): Promise<Delivery> {
    await delay(220);
    const delivery = deliveries.find((entry) => entry.orderId === orderId);
    if (!delivery) {
      throw new ApiError(
        { code: 'delivery_not_found', message: 'Delivery not found for this order.' },
        404,
      );
    }
    return delivery;
  }

  async getActiveForDriver(driverId: string): Promise<Delivery | null> {
    await delay(220);
    return (
      deliveries.find(
        (delivery) =>
          delivery.driverId === driverId &&
          delivery.status !== 'DELIVERED' &&
          delivery.status !== 'CANCELLED',
      ) ?? null
    );
  }

  async createForOrder(input: { idempotencyKey?: string; orderId: string }): Promise<Delivery> {
    await delay(220);

    const existing = deliveries.find((entry) => entry.orderId === input.orderId);
    if (existing) return existing;

    const order = orders.find((entry) => entry.id === input.orderId);
    if (!order) {
      throw new ApiError(
        { code: 'order_not_found', message: 'That order could not be found.' },
        404,
      );
    }

    const now = new Date().toISOString();
    const delivery: Delivery = {
      id: `dlv_new_${Date.now()}`,
      orderId: order.id,
      driverId: null,
      restaurantId: order.restaurantId,
      customerId: order.customerId,
      status: 'PENDING_ASSIGNMENT',
      driverLocation: null,
      assignmentHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    deliveries.unshift(delivery);
    order.deliveryId = delivery.id;
    return delivery;
  }

  async assign(
    deliveryId: string,
    driverId: string,
    options: DeliveryAssignmentOptions = {},
  ): Promise<Delivery> {
    await delay(340);
    const delivery = findDeliveryOrThrow(deliveryId);
    const driver = findDriver(driverId);

    if (delivery.status !== 'PENDING_ASSIGNMENT') {
      throw new ApiError(
        { code: 'delivery_not_assignable', message: 'This delivery is no longer awaiting assignment.' },
        409,
      );
    }

    const order = findOrderForDelivery(delivery);
    validateOrderAcceptsDelivery(order);
    validateDriverForAssignment(driver, findRestaurantForDelivery(delivery));

    attachDriver(delivery, driver);
    pushAssignmentEvent(delivery, {
      action: 'ASSIGNED',
      source: 'MANUAL',
      newDriver: driver,
      adminId: options.actorId ?? null,
      reason: 'Manual assignment by platform operations.',
    });

    return delivery;
  }

  async autoAssign(
    deliveryId: string,
    options: AutoAssignDeliveryOptions = {},
  ): Promise<DeliveryAutoAssignmentResult> {
    await delay(320);
    const trigger: AutoAssignmentTrigger = options.trigger ?? 'ADMIN_RETRY';

    return attemptAutoAssignment(deliveryId, {
      trigger,
      adminId: options.actorId ?? null,
      excludeDriverIds: options.excludeDriverIds,
      force: options.force ?? trigger === 'ADMIN_RETRY',
      reason: options.reason,
    });
  }

  async unassign(
    deliveryId: string,
    reason: string,
    options: DeliveryAssignmentOptions = {},
  ): Promise<Delivery> {
    await delay(320);
    const delivery = findDeliveryOrThrow(deliveryId);
    assertPrePickupAssignment(delivery.status, 'unassign');

    if (!delivery.driverId) {
      throw new ApiError(
        { code: 'driver_required', message: 'This delivery has no assigned driver to release.' },
        409,
      );
    }

    const order = findOrderForDelivery(delivery);
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED' || order.status === 'REJECTED') {
      throw new ApiError(
        {
          code: 'order_closed',
          message: 'This order is already closed; its delivery cannot be reassigned.',
        },
        409,
      );
    }

    const previousDriver = releaseDriver(delivery);
    clearAssignmentFields(delivery);
    pushAssignmentEvent(delivery, {
      action: 'UNASSIGNED',
      source: 'MANUAL',
      previousDriver,
      adminId: options.actorId ?? null,
      reason,
    });

    // Requirement: after an unassign, attempt a replacement automatically. The
    // released driver is excluded so the delivery cannot bounce straight back.
    attemptAutoAssignment(delivery.id, {
      trigger: 'AFTER_UNASSIGN',
      adminId: options.actorId ?? null,
      excludeDriverIds: previousDriver ? [previousDriver.id] : [],
      reason: `Automatic replacement after unassignment: ${reason}`,
      force: true,
    });

    return delivery;
  }

  async reassign(
    deliveryId: string,
    driverId: string,
    reason: string,
    options: DeliveryAssignmentOptions = {},
  ): Promise<Delivery> {
    await delay(380);
    const delivery = findDeliveryOrThrow(deliveryId);
    const driver = findDriver(driverId);

    assertPrePickupAssignment(delivery.status, 'reassign');

    if (delivery.driverId === driver.id) {
      throw new ApiError(
        { code: 'driver_already_assigned', message: 'That driver is already assigned to this delivery.' },
        409,
      );
    }

    const order = findOrderForDelivery(delivery);
    validateOrderAcceptsDelivery(order);

    validateDriverForAssignment(driver, findRestaurantForDelivery(delivery));

    const previousDriver = releaseDriver(delivery);
    clearAssignmentFields(delivery);
    attachDriver(delivery, driver);

    // One append-only row records both ends of the swap.
    pushAssignmentEvent(delivery, {
      action: 'REASSIGNED',
      source: 'MANUAL',
      previousDriver,
      newDriver: driver,
      adminId: options.actorId ?? null,
      reason,
    });

    return delivery;
  }

  async transition(deliveryId: string, action: DeliveryAction): Promise<Delivery> {
    await delay(300);
    const delivery = findDeliveryOrThrow(deliveryId);

    if (action === 'ASSIGN') {
      throw new ApiError(
        { code: 'assignment_required', message: 'Use assign() so a driver can be selected.' },
        422,
      );
    }

    const nextStatus = deliveryActionStatus[action];
    if (!canTransitionDeliveryStatus(delivery.status, nextStatus)) {
      throw new ApiError(
        {
          code: 'invalid_delivery_transition',
          message: `A delivery in ${delivery.status} cannot transition to ${nextStatus}.`,
        },
        409,
      );
    }

    if (
      (action === 'PICK_UP' || action === 'START_TRANSIT' || action === 'DELIVER') &&
      !delivery.driverId
    ) {
      throw new ApiError(
        { code: 'driver_required', message: 'Assign a driver before advancing this delivery.' },
        409,
      );
    }

    if (action === 'PICK_UP' || action === 'START_TRANSIT' || action === 'DELIVER') {
      const driver = drivers.find((entry) => entry.id === delivery.driverId);
      if (!driver || driver.accountStatus !== 'APPROVED') {
        throw new ApiError(
          {
            code: 'driver_not_approved',
            message: 'The assigned driver is no longer approved for deliveries.',
          },
          409,
        );
      }
      if (driver.activeDeliveryId !== delivery.id) {
        throw new ApiError(
          {
            code: 'driver_assignment_mismatch',
            message: 'This delivery is not the driver’s active assignment.',
          },
          409,
        );
      }
    }

    const order = findOrderForDelivery(delivery);

    if (nextStatus === 'CANCELLED') {
      // Order cancellation is a separate operation. A cancelled delivery does
      // not silently cancel the customer's purchase.
      const at = new Date().toISOString();
      const released = releaseDriver(delivery);
      delivery.status = 'CANCELLED';
      delivery.cancelledAt = at;
      delivery.updatedAt = at;
      delivery.estimatedArrivalAt = undefined;
      delivery.driverLocation = null;
      if (released) retryPendingAssignmentsForDriver(released.id);
      return delivery;
    }

    if (action === 'PICK_UP' && order.status !== 'READY') {
      throw new ApiError(
        {
          code: 'order_not_ready',
          message: 'The restaurant must mark this order ready before pickup.',
        },
        409,
      );
    }

    if (action === 'DELIVER' && (order.status === 'CANCELLED' || order.status === 'REJECTED')) {
      throw new ApiError(
        {
          code: 'order_closed',
          message: 'A delivery cannot be completed for a closed order.',
        },
        409,
      );
    }

    const at = new Date().toISOString();
    delivery.status = nextStatus;
    delivery.updatedAt = at;
    if (nextStatus === 'PICKED_UP') delivery.pickedUpAt = at;
    if (nextStatus === 'DELIVERED') delivery.deliveredAt = at;

    if (nextStatus === 'DELIVERED') {
      const driver = releaseDriver(delivery);
      if (driver) driver.completedDeliveries += 1;
      delivery.driverLocation = null;

      // The backend should perform this transactionally with the delivery
      // completion. Here it is the one and only normal completion path.
      if (order.status !== 'CANCELLED' && order.status !== 'REJECTED' && order.status !== 'COMPLETED') {
        order.status = 'COMPLETED';
        order.completedAt = at;
      }

      // A driver is free again: give queued deliveries a bounded retry.
      if (driver) retryPendingAssignmentsForDriver(driver.id);
    }

    return delivery;
  }

  async updateLocation(deliveryId: string, input: DriverLocationInput): Promise<Delivery> {
    await delay(180);
    const delivery = findDeliveryOrThrow(deliveryId);
    if (!delivery.driverId) {
      throw new ApiError(
        { code: 'driver_required', message: 'This delivery has no assigned driver.' },
        409,
      );
    }

    if (!isActiveDeliveryStatus(delivery.status)) {
      throw new ApiError(
        {
          code: 'delivery_not_active',
          message: 'Location updates are only accepted while a delivery is active.',
        },
        409,
      );
    }

    const driver = drivers.find((entry) => entry.id === delivery.driverId);
    if (!driver || driver.accountStatus !== 'APPROVED') {
      throw new ApiError(
        {
          code: 'driver_not_approved',
          message: 'Location updates require an approved assigned driver.',
        },
        409,
      );
    }

    const updatedAt = new Date().toISOString();
    const location = {
      driverId: delivery.driverId,
      deliveryId: delivery.id,
      lat: input.lat,
      lng: input.lng,
      heading: input.heading,
      speedKph: input.speedKph,
      updatedAt,
    };

    upsertDriverLocation(location);
    delivery.driverLocation = location;
    delivery.updatedAt = updatedAt;
    return delivery;
  }
}
