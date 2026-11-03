import type { DeliveryStatus } from '@/types';

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

export const deliveryStatusMeta: Record<
  DeliveryStatus,
  { label: string; short: string; description: string }
> = {
  confirmed: {
    label: 'Order confirmed',
    short: 'Confirmed',
    description: 'The restaurant has received your order.',
  },
  preparing: {
    label: 'Being prepared',
    short: 'Preparing',
    description: 'The kitchen is cooking everything fresh.',
  },
  ready: {
    label: 'Ready for pickup',
    short: 'Ready',
    description: 'Packed and waiting for your delivery partner.',
  },
  on_the_way: {
    label: 'On the way',
    short: 'On the way',
    description: 'Your driver is heading to your door.',
  },
  arrived: {
    label: 'Arriving now',
    short: 'Arriving',
    description: 'Your driver is moments away.',
  },
  delivered: {
    label: 'Delivered',
    short: 'Delivered',
    description: 'Enjoy your meal.',
  },
  cancelled: {
    label: 'Cancelled',
    short: 'Cancelled',
    description: 'This order was cancelled.',
  },
};

export const orderStatusSequence: DeliveryStatus[] = [
  'confirmed',
  'preparing',
  'ready',
  'on_the_way',
  'delivered',
];
