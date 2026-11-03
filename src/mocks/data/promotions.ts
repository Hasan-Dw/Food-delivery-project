import type { Promotion } from '@/types';

export const promotions: Promotion[] = [
  {
    id: 'promo_first_order',
    title: 'Your first delivery is on us',
    subtitle: 'New customers get free delivery on orders over $25.',
    description:
      'Order from any restaurant in your neighbourhood and we will cover the delivery. No small print, no subscription.',
    code: 'HELLO25',
    imageKey: 'offer-table-spread',
    expiresAt: '2026-12-31T23:59:59.000Z',
    accent: 'terracotta',
    minOrder: 25,
  },
  {
    id: 'promo_pizza_night',
    title: 'Pizza night, sorted',
    subtitle: '20% off every pizza, Sunday to Thursday.',
    description:
      'Nonna Lucia is firing the oven for four nights a week. Twenty percent off every pie, dine-at-home style.',
    code: 'SLICE20',
    imageKey: 'offer-pizza-night',
    expiresAt: '2026-09-30T23:59:59.000Z',
    accent: 'olive',
    restaurantId: 'res_nonna_lucia',
    minOrder: 18,
  },
  {
    id: 'promo_something_sweet',
    title: 'Something sweet, delivered',
    subtitle: 'A free cookie box with your first bakery order.',
    description:
      'Crème & Crust bakes before sunrise. Add the code at checkout and six brown butter cookies are on the house.',
    code: 'SWEET6',
    imageKey: 'offer-sweet-tooth',
    expiresAt: '2026-08-31T23:59:59.000Z',
    accent: 'gold',
    restaurantId: 'res_creme_crust',
    minOrder: 20,
  },
];
