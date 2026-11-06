import type { Delivery, DeliveryAssignmentEvent } from '@/types';
import { findDriverLocation } from './driver-locations';

const now = Date.now();
const minute = 60_000;
const day = 24 * 60 * minute;

const iso = (offset: number) => new Date(now + offset).toISOString();

/**
 * Seeded audit rows follow the same append-only shape the mock services write
 * at runtime. `source` is AUTOMATIC here because these deliveries were assigned
 * by the platform before the demo session started.
 */
function seededAssignment(
  deliveryId: string,
  driverId: string,
  driverName: string,
  at: string,
): DeliveryAssignmentEvent {
  return {
    id: `ase_seed_${deliveryId}_${driverId}`,
    deliveryId,
    previousDriverId: null,
    newDriverId: driverId,
    driverId,
    driverName,
    action: 'ASSIGNED',
    source: 'AUTOMATIC',
    adminId: null,
    reason: 'Seeded platform assignment.',
    at,
  };
}

/**
 * Demo deliveries. Transportation is separate from the order: this entity owns
 * the driver, ETA, latest GPS point and delivery timestamps.
 */
export const deliveries: Delivery[] = [
  {
    id: 'dlv_10482',
    orderId: 'ord_10482',
    driverId: 'drv_daniel',
    restaurantId: 'res_koji_sushi',
    customerId: 'usr_maya_bennett',
    status: 'ON_THE_WAY',
    estimatedArrivalAt: iso(14 * minute),
    assignedAt: iso(-18 * minute),
    pickedUpAt: iso(-12 * minute),
    driverLocation: findDriverLocation('drv_daniel') ?? null,
    assignmentHistory: [
      seededAssignment('dlv_10482', 'drv_daniel', 'Daniel Okafor', iso(-18 * minute)),
    ],
    createdAt: iso(-22 * minute),
    updatedAt: iso(-1 * minute),
  },
  {
    id: 'dlv_10476',
    orderId: 'ord_10476',
    driverId: null,
    restaurantId: 'res_green_bowl',
    customerId: 'usr_maya_bennett',
    status: 'PENDING_ASSIGNMENT',
    driverLocation: null,
    createdAt: iso(-6 * minute),
    updatedAt: iso(-6 * minute),
  },
  {
    id: 'dlv_10411',
    orderId: 'ord_10411',
    driverId: 'drv_daniel',
    restaurantId: 'res_creme_crust',
    customerId: 'usr_maya_bennett',
    status: 'DELIVERED',
    estimatedArrivalAt: iso(-2 * day),
    assignedAt: iso(-2 * day - 30 * minute),
    pickedUpAt: iso(-2 * day - 8 * minute),
    deliveredAt: iso(-2 * day + 4 * minute),
    driverLocation: null,
    assignmentHistory: [
      seededAssignment(
        'dlv_10411',
        'drv_daniel',
        'Daniel Okafor',
        iso(-2 * day - 30 * minute),
      ),
    ],
    createdAt: iso(-2 * day - 40 * minute),
    updatedAt: iso(-2 * day + 4 * minute),
  },
  {
    id: 'dlv_10356',
    orderId: 'ord_10356',
    driverId: 'drv_daniel',
    restaurantId: 'res_nonna_lucia',
    customerId: 'usr_maya_bennett',
    status: 'DELIVERED',
    estimatedArrivalAt: iso(-8 * day + 45 * minute),
    assignedAt: iso(-8 * day + 15 * minute),
    pickedUpAt: iso(-8 * day + 20 * minute),
    deliveredAt: iso(-8 * day + 41 * minute),
    driverLocation: null,
    assignmentHistory: [
      seededAssignment(
        'dlv_10356',
        'drv_daniel',
        'Daniel Okafor',
        iso(-8 * day + 15 * minute),
      ),
    ],
    createdAt: iso(-8 * day),
    updatedAt: iso(-8 * day + 41 * minute),
  },
  {
    id: 'dlv_10302',
    orderId: 'ord_10302',
    driverId: null,
    restaurantId: 'res_smoke_honey',
    customerId: 'usr_maya_bennett',
    status: 'CANCELLED',
    estimatedArrivalAt: iso(-15 * day + 40 * minute),
    cancelledAt: iso(-15 * day + 6 * minute),
    driverLocation: null,
    createdAt: iso(-15 * day),
    updatedAt: iso(-15 * day + 6 * minute),
  },
  {
    id: 'dlv_10490',
    orderId: 'ord_10490',
    driverId: null,
    restaurantId: 'res_koji_sushi',
    customerId: 'usr_noah_kim',
    status: 'PENDING_ASSIGNMENT',
    driverLocation: null,
    createdAt: iso(-4 * minute),
    updatedAt: iso(-4 * minute),
  },
  {
    id: 'dlv_10491',
    orderId: 'ord_10491',
    driverId: null,
    restaurantId: 'res_koji_sushi',
    customerId: 'usr_ava_patel',
    status: 'PENDING_ASSIGNMENT',
    driverLocation: null,
    createdAt: iso(-9 * minute),
    updatedAt: iso(-9 * minute),
  },
  {
    id: 'dlv_10492',
    orderId: 'ord_10492',
    // Priya operates in Manhattan, so she cannot be seeded onto a Brooklyn
    // delivery. This delivery stays in the assignment pool until a compatible
    // driver is available.
    driverId: null,
    restaurantId: 'res_koji_sushi',
    customerId: 'usr_noah_kim',
    status: 'PENDING_ASSIGNMENT',
    driverLocation: null,
    createdAt: iso(-13 * minute),
    updatedAt: iso(-7 * minute),
  },
  {
    id: 'dlv_10493',
    orderId: 'ord_10493',
    driverId: 'drv_daniel',
    restaurantId: 'res_koji_sushi',
    customerId: 'usr_ava_patel',
    status: 'DELIVERED',
    estimatedArrivalAt: iso(-1 * day - 10 * minute),
    assignedAt: iso(-1 * day - 28 * minute),
    pickedUpAt: iso(-1 * day - 22 * minute),
    deliveredAt: iso(-1 * day - 6 * minute),
    driverLocation: null,
    assignmentHistory: [
      seededAssignment(
        'dlv_10493',
        'drv_daniel',
        'Daniel Okafor',
        iso(-1 * day - 28 * minute),
      ),
    ],
    createdAt: iso(-1 * day - 32 * minute),
    updatedAt: iso(-1 * day - 6 * minute),
  },
  {
    id: 'dlv_10494',
    orderId: 'ord_10494',
    driverId: null,
    restaurantId: 'res_koji_sushi',
    customerId: 'usr_noah_kim',
    status: 'CANCELLED',
    cancelledAt: iso(-3 * day + 2 * minute),
    driverLocation: null,
    createdAt: iso(-3 * day),
    updatedAt: iso(-3 * day + 2 * minute),
  },
];

export function findDelivery(id: string): Delivery | undefined {
  return deliveries.find((delivery) => delivery.id === id);
}

export function findDeliveryByOrder(orderId: string): Delivery | undefined {
  return deliveries.find((delivery) => delivery.orderId === orderId);
}
