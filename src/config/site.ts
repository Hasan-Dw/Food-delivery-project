import type { DeliveryStatus, OrderStatus } from '@/types';

export const site = {
  name: 'Savora',
  tagline: 'Discover. Order. Enjoy.',
  description:
    'Savora brings exceptional independent restaurants to your door. Discover local favourites, order in a few taps and follow every moment from kitchen to doorstep.',
  email: 'hello@savora.co',
  phone: '+1 (718) 555-0142',
  supportHours: 'Every day · 8am – 11pm',
  address: '148 Wythe Avenue, Brooklyn, NY 11249',
  social: [
    { label: 'Instagram', href: 'https://instagram.com' },
    { label: 'TikTok', href: 'https://tiktok.com' },
    { label: 'X', href: 'https://x.com' },
  ],
  stats: {
    restaurants: '240+',
    cities: '12',
    diners: '48k',
    averageRating: '4.8',
  },
  demo: {
    email: 'maya@example.com',
    password: 'Savora123!',
  },
} as const;

interface StatusMeta {
  label: string;
  short: string;
  description: string;
}

/** Customer purchase lifecycle labels. Delivery labels are kept separate. */
export const orderStatusMeta: Record<OrderStatus, StatusMeta> = {
  PENDING: {
    label: 'Order placed',
    short: 'Placed',
    description: 'Waiting for the restaurant to confirm your order.',
  },
  ACCEPTED: {
    label: 'Order accepted',
    short: 'Accepted',
    description: 'The restaurant has confirmed your order.',
  },
  REJECTED: {
    label: 'Order rejected',
    short: 'Rejected',
    description: 'The restaurant could not accept this order.',
  },
  PREPARING: {
    label: 'Being prepared',
    short: 'Preparing',
    description: 'The kitchen is cooking everything fresh.',
  },
  READY: {
    label: 'Ready for pickup',
    short: 'Ready',
    description: 'Packed and waiting for your delivery partner.',
  },
  COMPLETED: {
    label: 'Completed',
    short: 'Completed',
    description: 'This order has been completed.',
  },
  CANCELLED: {
    label: 'Cancelled',
    short: 'Cancelled',
    description: 'This order was cancelled.',
  },
};

/** Transportation lifecycle labels, separate from the restaurant's order. */
export const deliveryStatusMeta: Record<DeliveryStatus, StatusMeta> = {
  PENDING_ASSIGNMENT: {
    label: 'Finding a driver',
    short: 'Assigning',
    description: 'We are matching your order with a delivery partner.',
  },
  ASSIGNED: {
    label: 'Driver assigned',
    short: 'Assigned',
    description: 'A delivery partner is heading to the restaurant.',
  },
  PICKED_UP: {
    label: 'Picked up',
    short: 'Picked up',
    description: 'Your order has left the restaurant.',
  },
  ON_THE_WAY: {
    label: 'On the way',
    short: 'On the way',
    description: 'Your driver is heading to your door.',
  },
  DELIVERED: {
    label: 'Delivered',
    short: 'Delivered',
    description: 'Enjoy your meal.',
  },
  CANCELLED: {
    label: 'Delivery cancelled',
    short: 'Cancelled',
    description: 'This delivery was cancelled.',
  },
};

/** Combined lookup for the customer tracking view. */
export const trackingStatusMeta: Record<OrderStatus | DeliveryStatus, StatusMeta> = {
  ...orderStatusMeta,
  ...deliveryStatusMeta,
};

export const orderStatusSequence: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'COMPLETED',
];

export const deliveryStatusSequence: DeliveryStatus[] = [
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
  'DELIVERED',
];
