import type { Order } from '@/types';
import { demoAddresses, paymentMethods } from './user';

const now = Date.now();
const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

const iso = (offset: number) => new Date(now + offset).toISOString();

/**
 * Demo orders. Dates are generated relative to load time so the interface
 * always feels current; the shape matches `GET /orders`.
 */
export const orders: Order[] = [
  {
    id: 'ord_10482',
    code: 'SV-10482',
    restaurantId: 'res_koji_sushi',
    restaurantName: 'Kōji Sushi',
    restaurantImageKey: 'restaurant-koji-sushi',
    items: [
      {
        id: 'oi_1',
        productId: 'prod_salmon_nigiri',
        name: 'Salmon Nigiri Set',
        imageKey: 'dish-salmon-nigiri',
        quantity: 1,
        unitPrice: 24,
      },
      {
        id: 'oi_2',
        productId: 'prod_tonkotsu',
        name: 'Tonkotsu Ramen',
        imageKey: 'dish-tonkotsu',
        quantity: 1,
        unitPrice: 17.5,
      },
    ],
    status: 'on_the_way',
    placedAt: iso(-22 * minute),
    estimatedDeliveryAt: iso(14 * minute),
    deliveryAddress: demoAddresses[0],
    driverId: 'drv_daniel',
    totals: {
      subtotal: 41.5,
      deliveryFee: 1.99,
      serviceFee: 2.5,
      discount: 0,
      tax: 3.65,
      total: 49.64,
    },
    paymentMethod: paymentMethods[0],
  },
  {
    id: 'ord_10476',
    code: 'SV-10476',
    restaurantId: 'res_green_bowl',
    restaurantName: 'Green Bowl Co.',
    restaurantImageKey: 'restaurant-green-bowl',
    items: [
      {
        id: 'oi_3',
        productId: 'prod_green_goddess',
        name: 'Green Goddess Bowl',
        imageKey: 'dish-green-goddess',
        quantity: 2,
        unitPrice: 15,
      },
    ],
    status: 'preparing',
    placedAt: iso(-6 * minute),
    estimatedDeliveryAt: iso(32 * minute),
    deliveryAddress: demoAddresses[1],
    totals: {
      subtotal: 30,
      deliveryFee: 0.99,
      serviceFee: 2.5,
      discount: 3,
      tax: 2.66,
      total: 33.15,
    },
    paymentMethod: paymentMethods[1],
    couponCode: 'GREENS3',
  },
  {
    id: 'ord_10411',
    code: 'SV-10411',
    restaurantId: 'res_creme_crust',
    restaurantName: 'Crème & Crust',
    restaurantImageKey: 'restaurant-creme-crust',
    items: [
      {
        id: 'oi_4',
        productId: 'prod_chocolate_torte',
        name: 'Dark Chocolate Torte',
        imageKey: 'dish-chocolate-torte',
        quantity: 2,
        unitPrice: 9.5,
      },
      {
        id: 'oi_5',
        productId: 'prod_cookies',
        name: 'Brown Butter Cookies',
        imageKey: 'dish-cookies',
        quantity: 1,
        unitPrice: 12,
      },
    ],
    status: 'delivered',
    placedAt: iso(-2 * day - 40 * minute),
    estimatedDeliveryAt: iso(-2 * day),
    deliveredAt: iso(-2 * day + 4 * minute),
    deliveryAddress: demoAddresses[0],
    driverId: 'drv_daniel',
    totals: {
      subtotal: 31,
      deliveryFee: 0,
      serviceFee: 2.5,
      discount: 0,
      tax: 2.71,
      total: 36.21,
    },
    paymentMethod: paymentMethods[0],
  },
  {
    id: 'ord_10356',
    code: 'SV-10356',
    restaurantId: 'res_nonna_lucia',
    restaurantName: 'Nonna Lucia',
    restaurantImageKey: 'restaurant-nonna-lucia',
    items: [
      {
        id: 'oi_6',
        productId: 'prod_pesto_rigatoni',
        name: 'Pesto Rigatoni',
        imageKey: 'dish-pesto-rigatoni',
        quantity: 1,
        unitPrice: 17,
      },
      {
        id: 'oi_7',
        productId: 'prod_truffle_pizza',
        name: 'Truffle Mushroom Pizza',
        imageKey: 'dish-truffle-pizza',
        quantity: 1,
        unitPrice: 18.5,
      },
    ],
    status: 'delivered',
    placedAt: iso(-8 * day),
    estimatedDeliveryAt: iso(-8 * day + 45 * minute),
    deliveredAt: iso(-8 * day + 41 * minute),
    deliveryAddress: demoAddresses[0],
    driverId: 'drv_daniel',
    totals: {
      subtotal: 35.5,
      deliveryFee: 2.49,
      serviceFee: 2.5,
      discount: 0,
      tax: 3.2,
      total: 43.69,
    },
    paymentMethod: paymentMethods[0],
  },
  {
    id: 'ord_10302',
    code: 'SV-10302',
    restaurantId: 'res_smoke_honey',
    restaurantName: 'Smoke & Honey',
    restaurantImageKey: 'restaurant-smoke-honey',
    items: [
      {
        id: 'oi_8',
        productId: 'prod_brisket',
        name: '12-Hour Smoked Brisket',
        imageKey: 'dish-brisket',
        quantity: 1,
        unitPrice: 22,
      },
    ],
    status: 'cancelled',
    placedAt: iso(-15 * day),
    estimatedDeliveryAt: iso(-15 * day + 40 * minute),
    deliveryAddress: demoAddresses[1],
    totals: {
      subtotal: 22,
      deliveryFee: 2.99,
      serviceFee: 2.5,
      discount: 0,
      tax: 2.03,
      total: 29.52,
    },
    paymentMethod: paymentMethods[1],
  },
];

export function findOrder(id: string): Order | undefined {
  return orders.find((order) => order.id === id || order.code === id);
}

export const activeOrder = orders[0];
