import type {
  Delivery,
  DeliveryStatus,
  Order,
  OrderStatus,
  TrackingEvent,
  TrackingSnapshot,
} from '@/types';
import { demoAddresses } from './user';
import { drivers } from './drivers';
import { restaurants } from './restaurants';
import { findDeliveryByOrder } from './deliveries';
import { findDriverLocation } from './driver-locations';
import { findOrder } from './orders';

/**
 * Illustrative demo route. These points are kept in the same shape a real map
 * provider expects, but they are **not** live GPS data. The tracking page
 * labels the map as demo mode accordingly.
 */
export const demoRoutePoints = [
  { lat: 40.7186, lng: -73.9614 },
  { lat: 40.7179, lng: -73.9626 },
  { lat: 40.7164, lng: -73.9641 },
  { lat: 40.7148, lng: -73.9663 },
  { lat: 40.7126, lng: -73.9681 },
  { lat: 40.7101, lng: -73.9696 },
  { lat: 40.7072, lng: -73.9709 },
  { lat: 40.7041, lng: -73.9718 },
  { lat: 40.7008, lng: -73.9726 },
  { lat: 40.6972, lng: -73.9733 },
  { lat: 40.6931, lng: -73.9740 },
  { lat: 40.6898, lng: -73.9745 },
  { lat: 40.6872, lng: -73.9744 },
];

function progressFor(delivery?: Delivery): number {
  switch (delivery?.status) {
    case 'DELIVERED':
      return 1;
    case 'ON_THE_WAY':
      return 0.58;
    case 'PICKED_UP':
      return 0.18;
    case 'ASSIGNED':
      return 0.05;
    default:
      return 0;
  }
}

function etaMinutesFor(delivery: Delivery | undefined): number {
  if (!delivery || delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED') return 0;
  if (!delivery.estimatedArrivalAt) return delivery.status === 'PENDING_ASSIGNMENT' ? 35 : 28;
  return Math.max(0, Math.round((new Date(delivery.estimatedArrivalAt).getTime() - Date.now()) / 60_000));
}

export function buildTrackingSnapshot(orderId: string): TrackingSnapshot | undefined {
  const order = findOrder(orderId);
  if (!order) return undefined;

  const delivery = findDeliveryByOrder(order.id);
  const driver = delivery?.driverId
    ? drivers.find((candidate) => candidate.id === delivery.driverId)
    : undefined;
  const restaurant = restaurants.find((entry) => entry.id === order.restaurantId);
  const restaurantName = order.restaurantName;
  const destination = order.deliveryAddress;
  const driverLocation = (driver ? findDriverLocation(driver.id) : undefined) ?? delivery?.driverLocation ?? null;

  return {
    orderId: order.id,
    deliveryId: delivery?.id,
    orderStatus: order.status,
    deliveryStatus: delivery?.status ?? 'PENDING_ASSIGNMENT',
    driver,
    driverLocation,
    etaMinutes: etaMinutesFor(delivery),
    estimatedArrivalAt: delivery?.estimatedArrivalAt,
    deliveredAt: delivery?.deliveredAt,
    restaurant: {
      label: restaurantName,
      address: restaurant
        ? `${restaurant.address.line1}, ${restaurant.address.city}`
        : `${destination.city}, ${destination.state}`,
      coordinates: demoRoutePoints[0],
    },
    destination: {
      label: destination.label,
      address: `${destination.line1}${destination.line2 ? `, ${destination.line2}` : ''}, ${destination.city}`,
      coordinates: demoRoutePoints[demoRoutePoints.length - 1],
    },
    route: {
      points: demoRoutePoints,
      distanceKm: 2.4,
    },
    progress: progressFor(delivery),
    lastUpdated: delivery?.driverLocation?.updatedAt ?? delivery?.updatedAt ?? new Date().toISOString(),
    live: false,
  };
}

const orderReached = (order: Order, statuses: OrderStatus[]) => statuses.includes(order.status);
const deliveryReached = (delivery: Delivery | undefined, statuses: DeliveryStatus[]) =>
  Boolean(delivery && statuses.includes(delivery.status));

export function buildStatusHistory(orderId: string): TrackingEvent[] {
  const order = findOrder(orderId);
  if (!order) return [];

  const delivery = findDeliveryByOrder(order.id);
  const placed = new Date(order.placedAt).getTime();
  const at = (minutes: number) => new Date(placed + minutes * 60_000).toISOString();

  if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
    return [
      {
        kind: 'order',
        status: 'PENDING',
        label: 'Order placed',
        description: 'Payment authorised and sent to the restaurant.',
        timestamp: order.placedAt,
        completed: true,
      },
      {
        kind: 'order',
        status: 'CANCELLED',
        label: order.status === 'REJECTED' ? 'Order rejected' : 'Order cancelled',
        description:
          order.status === 'REJECTED'
            ? 'The restaurant could not accept this order and no delivery was made.'
            : 'This order was cancelled before delivery completed.',
        timestamp: order.rejectedAt ?? order.cancelledAt ?? order.acceptedAt ?? at(1),
        completed: true,
      },
    ];
  }

  const delivered = deliveryReached(delivery, ['DELIVERED']);
  const destination = demoAddresses[0];

  return [
    {
      kind: 'order',
      status: 'PENDING',
      label: 'Order placed',
      description: 'Payment authorised and sent to the restaurant.',
      timestamp: order.placedAt,
      completed: true,
    },
    {
      kind: 'order',
      status: 'PREPARING',
      label: 'In the kitchen',
      description: 'Your order is being prepared fresh.',
      timestamp: order.preparingAt ?? at(4),
      completed: orderReached(order, ['PREPARING', 'READY', 'COMPLETED']),
    },
    {
      kind: 'order',
      status: 'READY',
      label: 'Packed & ready',
      description: 'Sealed, labelled and ready for your delivery partner.',
      timestamp: order.readyAt ?? at(15),
      completed: orderReached(order, ['READY', 'COMPLETED']),
    },
    {
      kind: 'delivery',
      status: 'ASSIGNED',
      label: 'Driver assigned',
      description: 'A Savora delivery partner is heading to the restaurant.',
      timestamp: delivery?.assignedAt ?? at(16),
      completed: deliveryReached(delivery, ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED']),
    },
    {
      kind: 'delivery',
      status: 'ON_THE_WAY',
      label: 'On the way',
      description: 'Your delivery partner is heading to you.',
      timestamp: delivery?.pickedUpAt ?? at(18),
      completed: deliveryReached(delivery, ['ON_THE_WAY', 'DELIVERED']),
    },
    {
      kind: 'delivery',
      status: 'DELIVERED',
      label: delivered ? 'Delivered' : 'Delivery',
      description: delivered
        ? `Left with you at ${destination.line1}.`
        : 'Estimated arrival based on the current route.',
      timestamp: delivery?.deliveredAt ?? delivery?.estimatedArrivalAt,
      completed: delivered,
    },
  ];
}
