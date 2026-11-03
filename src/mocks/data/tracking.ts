import type { OrderStatusEvent, TrackingSnapshot } from '@/types';
import { demoAddresses } from './user';
import { drivers } from './drivers';
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

export function buildTrackingSnapshot(orderId: string): TrackingSnapshot | undefined {
  const order = findOrder(orderId);
  if (!order) return undefined;

  const driver = drivers.find((candidate) => candidate.id === order.driverId);
  const restaurantName = order.restaurantName;
  const destination = order.deliveryAddress;

  const isComplete = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  return {
    orderId: order.id,
    status: order.status,
    driver,
    etaMinutes: isComplete || isCancelled ? 0 : 14,
    restaurant: {
      label: restaurantName,
      address: 'Kōji Sushi · 31 Grand Street, Brooklyn',
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
    progress: isComplete ? 1 : isCancelled ? 0 : 0.58,
    lastUpdated: new Date().toISOString(),
    live: false,
  };
}

export function buildStatusHistory(orderId: string): OrderStatusEvent[] {
  const order = findOrder(orderId);
  if (!order) return [];

  const placed = new Date(order.placedAt).getTime();
  const at = (minutes: number) => new Date(placed + minutes * 60_000).toISOString();
  const reached = (status: (typeof order.status)[]) => status.includes(order.status);
  const delivered = order.status === 'delivered';

  return [
    {
      status: 'confirmed',
      label: 'Order confirmed',
      description: 'Payment authorised and sent to the restaurant.',
      timestamp: at(0),
      completed: true,
    },
    {
      status: 'preparing',
      label: 'In the kitchen',
      description: 'Your order is being prepared fresh.',
      timestamp: at(4),
      completed: reached(['preparing', 'ready', 'on_the_way', 'arrived', 'delivered']),
    },
    {
      status: 'ready',
      label: 'Packed & ready',
      description: 'Sealed, labelled and handed to your driver.',
      timestamp: at(15),
      completed: reached(['ready', 'on_the_way', 'arrived', 'delivered']),
    },
    {
      status: 'on_the_way',
      label: 'On the way',
      description: 'Your delivery partner is heading to you.',
      timestamp: at(18),
      completed: reached(['on_the_way', 'arrived', 'delivered']),
    },
    {
      status: 'delivered',
      label: delivered ? 'Delivered' : 'Delivery',
      description: delivered
        ? `Left with you at ${demoAddresses[0].line1}.`
        : 'Estimated arrival based on the current route.',
      timestamp: delivered ? order.deliveredAt : order.estimatedDeliveryAt,
      completed: delivered,
    },
  ];
}
