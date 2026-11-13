import type { Address, Delivery, Driver, Order } from '@/types';

export function completedRevenue(orders: Order[]): number {
  return orders
    .filter((order) => order.status === 'COMPLETED')
    .reduce((sum, order) => sum + order.totals.total, 0);
}

export function averageOrderValue(orders: Order[]): number {
  const completed = orders.filter((order) => order.status === 'COMPLETED');
  if (!completed.length) return 0;
  return completedRevenue(completed) / completed.length;
}

export function formatAddress(address: Address): string {
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`]
    .filter(Boolean)
    .join(' · ');
}

export function driverForDelivery(delivery: Delivery | undefined, drivers: Driver[]): Driver | undefined {
  if (!delivery?.driverId) return undefined;
  return drivers.find((driver) => driver.id === delivery.driverId);
}

export function orderCode(order: Order | undefined): string {
  return order?.code ?? '—';
}

export function orderForDelivery(orderId: string, orders: Order[]): Order | undefined {
  return orders.find((order) => order.id === orderId);
}

export function percentage(part: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}
