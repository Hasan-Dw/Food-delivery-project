import type {
  AssignmentSource,
  Delivery,
  DeliveryAssignmentEvent,
  Driver,
  Order,
  Restaurant,
} from '@/types';
import { deliveries } from '@/mocks/data/deliveries';
import { drivers } from '@/mocks/data/drivers';
import { orders } from '@/mocks/data/orders';
import { restaurants } from '@/mocks/data/restaurants';
import { canAssignDelivery, driverAssignmentBlockReason } from '@/lib/permissions';
import { serviceAreasCompatible } from '@/lib/driver-assignment';
import { ApiError } from '@/services/api/errors';

/**
 * Shared mock delivery store helpers.
 *
 * Assignment is a platform operation: every mutation goes through these helpers
 * so the delivery, the driver and the assignment audit stay in step. The HTTP
 * backend must perform the same work atomically and never trust the browser.
 */

export function findDeliveryOrThrow(deliveryId: string): Delivery {
  const delivery = deliveries.find((entry) => entry.id === deliveryId);
  if (!delivery) {
    throw new ApiError({ code: 'delivery_not_found', message: 'Delivery not found.' }, 404);
  }
  return delivery;
}

export function findOrderForDelivery(delivery: Delivery): Order {
  const order = orders.find((entry) => entry.id === delivery.orderId);
  if (!order) {
    throw new ApiError(
      { code: 'order_not_found', message: 'The order for this delivery no longer exists.' },
      404,
    );
  }
  return order;
}

export function findRestaurantForDelivery(delivery: Delivery): Restaurant | undefined {
  return restaurants.find((entry) => entry.id === delivery.restaurantId);
}

export function validateOrderAcceptsDelivery(order: Order): void {
  if (order.status === 'CANCELLED' || order.status === 'REJECTED' || order.status === 'COMPLETED') {
    throw new ApiError(
      {
        code: 'order_not_assignable',
        message: `An order in ${order.status} cannot receive a delivery.`,
      },
      409,
    );
  }
}

/**
 * Validate every assignment precondition that the UI also displays, plus the
 * coarse service-area rule. A backend must repeat these checks inside the
 * assignment transaction.
 */
export function validateDriverForAssignment(driver: Driver, restaurant?: Restaurant): void {
  if (!canAssignDelivery(driver)) {
    throw new ApiError(
      {
        code: 'driver_unavailable',
        message: `That driver cannot be assigned: ${driverAssignmentBlockReason(driver) ?? 'not available'}.`,
      },
      409,
    );
  }

  if (
    restaurant &&
    !serviceAreasCompatible(driver.serviceArea, restaurant.address.city)
  ) {
    throw new ApiError(
      {
        code: 'driver_outside_service_area',
        message: `${driver.name} operates in ${driver.serviceArea ?? 'another area'}; this delivery is in ${restaurant.address.city}.`,
      },
      409,
    );
  }
}

export interface AssignmentEventInput {
  action: DeliveryAssignmentEvent['action'];
  source: AssignmentSource;
  newDriver?: Driver | null;
  previousDriver?: Driver | null;
  adminId?: string | null;
  reason?: string;
}

/** Append-only event creation. Existing rows are never rewritten. */
export function pushAssignmentEvent(delivery: Delivery, input: AssignmentEventInput): DeliveryAssignmentEvent {
  const driver = input.newDriver ?? input.previousDriver ?? null;
  const event: DeliveryAssignmentEvent = {
    id: `ase_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    deliveryId: delivery.id,
    previousDriverId: input.previousDriver?.id ?? null,
    newDriverId: input.newDriver?.id ?? null,
    driverId: driver?.id ?? null,
    driverName: driver?.name ?? null,
    action: input.action,
    source: input.source,
    adminId: input.adminId ?? null,
    reason: input.reason?.trim() || undefined,
    at: new Date().toISOString(),
  };

  delivery.assignmentHistory = [...(delivery.assignmentHistory ?? []), event];
  return event;
}

/** Release a driver without changing the customer's order. */
export function releaseDriver(delivery: Delivery): Driver | null {
  if (!delivery.driverId) return null;
  const driver = drivers.find((entry) => entry.id === delivery.driverId) ?? null;
  if (driver && driver.activeDeliveryId === delivery.id) {
    driver.activeDeliveryId = null;
    driver.availability = driver.accountStatus === 'APPROVED' ? 'AVAILABLE' : 'OFFLINE';
  }
  return driver;
}

export function clearAssignmentFields(delivery: Delivery): void {
  delivery.driverId = null;
  delivery.assignedAt = undefined;
  delivery.pickedUpAt = undefined;
  delivery.deliveredAt = undefined;
  delivery.estimatedArrivalAt = undefined;
  delivery.driverLocation = null;
  delivery.status = 'PENDING_ASSIGNMENT';
  delivery.updatedAt = new Date().toISOString();
}

export function attachDriver(delivery: Delivery, driver: Driver): void {
  const at = new Date().toISOString();
  delivery.driverId = driver.id;
  delivery.status = 'ASSIGNED';
  delivery.assignedAt = at;
  delivery.updatedAt = at;
  delivery.pickedUpAt = undefined;
  delivery.deliveredAt = undefined;
  delivery.driverLocation = null;
  delivery.estimatedArrivalAt = new Date(Date.now() + 28 * 60_000).toISOString();

  driver.activeDeliveryId = delivery.id;
  driver.availability = 'ON_DELIVERY';

  const order = findOrderForDelivery(delivery);
  order.deliveryId = delivery.id;
}

/** Latest automatic-assignment outcome for a delivery. */
export function findAutoAssignmentState(delivery: Delivery) {
  return delivery.autoAssignment ?? null;
}
