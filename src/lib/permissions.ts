import type {
  AccountStatus,
  Delivery,
  DeliveryAction,
  DeliveryAssignmentAction,
  DeliveryStatus,
  Driver,
  ID,
  OrderAction,
  OrderStatus,
  User,
  UserRole,
} from '@/types';
import { ROUTES } from '@/config/routes';
import {
  canTransitionDeliveryStatus,
  canTransitionOrderStatus,
  canUnassignDelivery,
  deliveryActionStatus,
  orderActionStatus,
} from './order-lifecycle';

/**
 * Frontend action matrix. This is a UX and routing aid, not authorization:
 * every request must still be authorized by the backend from the session's
 * token, never from a role supplied by the browser.
 *
 * `COMPLETE` is intentionally absent. Successful delivery completion is the
 * only normal source of order completion.
 */
const orderActionsByRole: Record<UserRole, readonly OrderAction[]> = {
  CUSTOMER: ['CANCEL'],
  RESTAURANT_OWNER: ['ACCEPT', 'REJECT', 'PREPARE', 'READY'],
  DRIVER: [],
  ADMIN: ['ACCEPT', 'REJECT', 'PREPARE', 'READY', 'CANCEL'],
};

const deliveryActionsByRole: Record<UserRole, readonly DeliveryAction[]> = {
  CUSTOMER: [],
  RESTAURANT_OWNER: [],
  DRIVER: ['PICK_UP', 'START_TRANSIT', 'DELIVER'],
  ADMIN: ['ASSIGN', 'CANCEL'],
};

const assignmentActionsByRole: Record<UserRole, readonly DeliveryAssignmentAction[]> = {
  CUSTOMER: [],
  RESTAURANT_OWNER: [],
  DRIVER: [],
  ADMIN: ['ASSIGN', 'UNASSIGN', 'REASSIGN'],
};

/** Identity and ownership context for a single frontend permission check. */
export interface ActorContext {
  role: UserRole;
  accountStatus: AccountStatus;
  userId: ID;
  restaurantId?: ID;
  driverId?: ID;
}

export interface OrderOwnership {
  customerId: ID;
  restaurantId: ID;
}

export interface DeliveryOwnership {
  customerId: ID;
  driverId: ID | null;
}

export function actorFromUser(user: User | null): ActorContext | null {
  if (!user) return null;
  return {
    role: user.role,
    accountStatus: user.accountStatus,
    userId: user.id,
    restaurantId: user.restaurantId,
    driverId: user.driverId,
  };
}

export function isApprovedAccount(status: AccountStatus): boolean {
  return status === 'APPROVED';
}

export function hasAnyRole(role: UserRole, roles: readonly UserRole[]): boolean {
  return roles.includes(role);
}

/**
 * Ownership-aware order permission. Customers may act only on their own
 * orders; restaurant owners only on orders for their own restaurant; admins
 * may act platform-wide.
 */
export function canActOnOrder(
  actor: ActorContext,
  order: OrderOwnership,
  action: OrderAction,
  currentStatus: OrderStatus,
): boolean {
  if (!isApprovedAccount(actor.accountStatus)) return false;
  if (!orderActionsByRole[actor.role].includes(action)) return false;
  if (!canTransitionOrderStatus(currentStatus, orderActionStatus[action])) return false;

  if (!ownsOrder(actor, order)) return false;
  return true;
}

/** Ownership check without lifecycle checks, useful for routing and filters. */
export function ownsOrder(actor: ActorContext, order: OrderOwnership): boolean {
  if (actor.role === 'ADMIN') return true;
  if (actor.role === 'CUSTOMER') return order.customerId === actor.userId;
  if (actor.role === 'RESTAURANT_OWNER') {
    return Boolean(actor.restaurantId) && order.restaurantId === actor.restaurantId;
  }
  return false;
}

/**
 * Ownership-aware delivery permission. A driver may update only the delivery
 * assigned to their own driver profile. Assignment is an admin operation.
 */
export function canActOnDelivery(
  actor: ActorContext,
  delivery: DeliveryOwnership,
  action: DeliveryAction,
  currentStatus: DeliveryStatus,
): boolean {
  if (!isApprovedAccount(actor.accountStatus)) return false;
  if (!deliveryActionsByRole[actor.role].includes(action)) return false;
  if (!canTransitionDeliveryStatus(currentStatus, deliveryActionStatus[action])) return false;

  if (actor.role === 'DRIVER') {
    return Boolean(actor.driverId) && delivery.driverId === actor.driverId;
  }

  return actor.role === 'ADMIN';
}

/** True when the actor may see a delivery at all. */
export function canViewDelivery(actor: ActorContext, delivery: DeliveryOwnership): boolean {
  if (actor.role === 'ADMIN') return true;
  if (actor.role === 'CUSTOMER') return delivery.customerId === actor.userId;
  if (actor.role === 'DRIVER') return Boolean(actor.driverId) && delivery.driverId === actor.driverId;
  return false;
}

/**
 * Platform assignment operations are admin-only. Unassign/reassign require an
 * assigned delivery that has not been picked up yet; the cancelled state never
 * returns to the pool.
 */
export function canManageDeliveryAssignment(
  actor: ActorContext,
  delivery: Pick<Delivery, 'status'>,
  action: DeliveryAssignmentAction,
): boolean {
  if (!isApprovedAccount(actor.accountStatus)) return false;
  if (!assignmentActionsByRole[actor.role].includes(action)) return false;

  if (action === 'ASSIGN') return delivery.status === 'PENDING_ASSIGNMENT';
  return canUnassignDelivery(delivery.status);
}

/** Legacy pure check retained for callers that do not yet have ownership data. */
export function canPerformOrderAction(
  role: UserRole,
  accountStatus: AccountStatus,
  action: OrderAction,
  currentStatus: OrderStatus,
): boolean {
  if (!isApprovedAccount(accountStatus)) return false;
  if (!orderActionsByRole[role].includes(action)) return false;
  return canTransitionOrderStatus(currentStatus, orderActionStatus[action]);
}

/** Legacy pure check retained for callers that do not yet have ownership data. */
export function canPerformDeliveryAction(
  role: UserRole,
  accountStatus: AccountStatus,
  action: DeliveryAction,
  currentStatus: DeliveryStatus,
): boolean {
  if (!isApprovedAccount(accountStatus)) return false;
  if (!deliveryActionsByRole[role].includes(action)) return false;
  return canTransitionDeliveryStatus(currentStatus, deliveryActionStatus[action]);
}

/**
 * A driver can only receive a new assignment when approved, available and not
 * already carrying an active delivery. The initial version never allows
 * multiple concurrent deliveries.
 */
export function canAssignDelivery(driver: Driver): boolean {
  return (
    driver.accountStatus === 'APPROVED' &&
    driver.availability === 'AVAILABLE' &&
    driver.activeDeliveryId === null
  );
}

/** Human-readable reason a driver cannot currently be assigned. */
export function driverAssignmentBlockReason(driver: Driver): string | null {
  if (driver.accountStatus !== 'APPROVED') {
    return driver.accountStatus === 'PENDING_APPROVAL'
      ? 'Awaiting approval'
      : driver.accountStatus === 'SUSPENDED'
        ? 'Suspended'
        : 'Application rejected';
  }
  if (driver.activeDeliveryId) return 'Already on a delivery';
  if (driver.availability !== 'AVAILABLE') return 'Offline';
  return null;
}

export function roleLandingPath(role: UserRole): string {
  switch (role) {
    case 'RESTAURANT_OWNER':
      return ROUTES.dashboard;
    case 'DRIVER':
      return ROUTES.driverDashboard;
    case 'ADMIN':
      return ROUTES.adminDashboard;
    case 'CUSTOMER':
    default:
      return ROUTES.customerDashboard;
  }
}

export const roleLabels: Record<UserRole, string> = {
  CUSTOMER: 'Customer',
  RESTAURANT_OWNER: 'Restaurant owner',
  DRIVER: 'Delivery partner',
  ADMIN: 'Administrator',
};
