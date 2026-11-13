import type {
  AutoAssignmentStatus,
  AutoAssignmentTrigger,
  Delivery,
  DeliveryAutoAssignmentResult,
  DeliveryAutoAssignmentState,
} from '@/types';
import { deliveries } from '@/mocks/data/deliveries';
import { drivers } from '@/mocks/data/drivers';
import { driverLocations } from '@/mocks/data/driver-locations';
import { orders } from '@/mocks/data/orders';
import { restaurants } from '@/mocks/data/restaurants';
import { countAssignmentsByDriver, rankEligibleDrivers } from '@/lib/driver-assignment';
import { attachDriver, pushAssignmentEvent } from './delivery-store';

/**
 * Mock automatic assignment engine.
 *
 * It is intentionally explicit rather than timer-driven:
 * - triggered when an order becomes READY;
 * - triggered when a driver becomes AVAILABLE or publishes a new position;
 * - triggered explicitly by an admin "Retry auto" action;
 * - triggered once after a manual unassign (excluding the released driver).
 *
 * A short cooldown plus a bounded attempt count prevents retry storms. A real
 * backend should run the same decision inside a transaction with a row lock so
 * one driver cannot be assigned to two deliveries concurrently.
 */

export const AUTO_ASSIGNMENT_COOLDOWN_MS = 15_000;
export const MAX_AUTOMATIC_ATTEMPTS = 5;

export interface AutoAssignmentOptions {
  trigger: AutoAssignmentTrigger;
  adminId?: string | null;
  /** Used after unassign so the same driver is not immediately re-attached. */
  excludeDriverIds?: string[];
  /** Appended to the assignment event, e.g. the admin unassign reason. */
  reason?: string;
  /** Explicit admin retry ignores cooldown and the attempt cap. */
  force?: boolean;
}

function persistState(
  delivery: Delivery,
  attempts: number,
  status: AutoAssignmentStatus,
  trigger: AutoAssignmentTrigger,
  reason?: string,
): void {
  const state: DeliveryAutoAssignmentState = {
    attempts,
    lastAttemptAt: new Date().toISOString(),
    lastTrigger: trigger,
    status,
    reason,
  };
  delivery.autoAssignment = state;
}

function result(
  delivery: Delivery,
  status: AutoAssignmentStatus,
  reason?: string,
): DeliveryAutoAssignmentResult {
  return { assigned: false, deliveryId: delivery.id, status, reason };
}

/**
 * Attempt automatic assignment for one delivery. Safe to call more than once:
 * a delivery that already left `PENDING_ASSIGNMENT` is skipped, not reassigned.
 */
export function attemptAutoAssignment(
  deliveryId: string,
  options: AutoAssignmentOptions,
): DeliveryAutoAssignmentResult {
  const delivery = deliveries.find((entry) => entry.id === deliveryId);

  if (!delivery) {
    return { assigned: false, deliveryId, status: 'SKIPPED', reason: 'Delivery not found.' };
  }

  // Idempotency guard: never duplicate an assignment attempt for a delivery
  // that already has a driver or is no longer in the pool.
  if (delivery.status !== 'PENDING_ASSIGNMENT' || delivery.driverId) {
    return result(delivery, 'SKIPPED', 'Delivery is no longer awaiting assignment.');
  }

  const order = orders.find((entry) => entry.id === delivery.orderId);
  if (!order) {
    return result(delivery, 'SKIPPED', 'The related order no longer exists.');
  }
  if (order.status !== 'READY') {
    return result(delivery, 'SKIPPED', 'Automatic assignment waits until the order is ready.');
  }

  const previous = delivery.autoAssignment;
  const attempts = previous?.attempts ?? 0;
  const isAutomaticTrigger = !options.force && options.trigger !== 'ADMIN_RETRY';
  const lastAttemptMs = previous?.lastAttemptAt
    ? new Date(previous.lastAttemptAt).getTime()
    : 0;

  if (isAutomaticTrigger && lastAttemptMs && Date.now() - lastAttemptMs < AUTO_ASSIGNMENT_COOLDOWN_MS) {
    return result(delivery, 'COOLDOWN', 'An automatic attempt just ran; retry after the cooldown.');
  }

  if (isAutomaticTrigger && attempts >= MAX_AUTOMATIC_ATTEMPTS) {
    persistState(
      delivery,
      attempts,
      'EXHAUSTED',
      options.trigger,
      'Automatic retry limit reached. An administrator can retry explicitly.',
    );
    return result(
      delivery,
      'EXHAUSTED',
      'Automatic retry limit reached. An administrator can retry explicitly.',
    );
  }

  const restaurant = restaurants.find((entry) => entry.id === delivery.restaurantId);
  const locationByDriver = new Map(
    driverLocations.map((location) => [location.driverId, { lat: location.lat, lng: location.lng }]),
  );

  const candidates = rankEligibleDrivers({
    drivers,
    restaurantCoordinates: restaurant?.address.coordinates ?? null,
    restaurantServiceArea: restaurant?.address.city ?? null,
    locationFor: (driverId) => locationByDriver.get(driverId) ?? null,
    recentAssignmentCounts: countAssignmentsByDriver(deliveries),
    excludeDriverIds: options.excludeDriverIds ?? [],
  });

  const best = candidates[0];

  if (!best) {
    const reason = restaurant
      ? `No approved, available driver in ${restaurant.address.city} is free right now.`
      : 'No approved, available driver is free right now.';
    persistState(delivery, attempts + 1, 'NO_ELIGIBLE_DRIVER', options.trigger, reason);
    return result(delivery, 'NO_ELIGIBLE_DRIVER', reason);
  }

  attachDriver(delivery, best.driver);
  pushAssignmentEvent(delivery, {
    action: 'ASSIGNED',
    source: 'AUTOMATIC',
    newDriver: best.driver,
    adminId: options.adminId ?? null,
    reason: options.reason ?? `Automatic assignment · ${best.rationale}`,
  });

  const reason = options.reason ?? `Automatic assignment · ${best.rationale}`;
  persistState(delivery, attempts + 1, 'ASSIGNED', options.trigger, reason);

  return {
    assigned: true,
    deliveryId: delivery.id,
    status: 'ASSIGNED',
    reason,
    driverId: best.driver.id,
    driverName: best.driver.name,
    distanceKm: best.distanceKm,
    etaMinutes: best.etaMinutes,
  };
}

/**
 * Retry pending deliveries after a driver becomes available or publishes a
 * location. Only READY orders are considered, and the loop stops as soon as the
 * driver has an assignment, so this cannot spin.
 */
export function retryPendingAssignmentsForDriver(
  driverId: string,
  trigger: Extract<AutoAssignmentTrigger, 'DRIVER_AVAILABLE' | 'DRIVER_LOCATION_UPDATED'> = 'DRIVER_AVAILABLE',
): DeliveryAutoAssignmentResult[] {
  const driver = drivers.find((entry) => entry.id === driverId);
  if (
    !driver ||
    driver.accountStatus !== 'APPROVED' ||
    driver.availability !== 'AVAILABLE' ||
    driver.activeDeliveryId
  ) {
    return [];
  }

  const pending = deliveries
    .filter((delivery) => delivery.status === 'PENDING_ASSIGNMENT' && !delivery.driverId)
    .filter((delivery) => orders.find((order) => order.id === delivery.orderId)?.status === 'READY')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 3);

  const results: DeliveryAutoAssignmentResult[] = [];

  for (const delivery of pending) {
    if (driver.availability !== 'AVAILABLE' || driver.activeDeliveryId) break;
    results.push(attemptAutoAssignment(delivery.id, { trigger }));
  }

  return results;
}
