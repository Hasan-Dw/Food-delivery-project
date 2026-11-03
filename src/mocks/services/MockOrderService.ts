import type { Order, OrderStatusEvent } from '@/types';
import { orders } from '@/mocks/data/orders';
import { buildStatusHistory } from '@/mocks/data/tracking';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { OrderService } from '@/services/orders/OrderService';

export class MockOrderService implements OrderService {
  async list(): Promise<Order[]> {
    await delay(420);
    return [...orders].sort(
      (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime(),
    );
  }

  async getActive(): Promise<Order | null> {
    await delay(320);
    return (
      orders.find((order) => order.status !== 'delivered' && order.status !== 'cancelled') ?? null
    );
  }

  async getById(orderId: string): Promise<Order> {
    await delay(380);
    const order = orders.find((entry) => entry.id === orderId || entry.code === orderId);
    if (!order) {
      throw new ApiError(
        { code: 'order_not_found', message: 'We could not find that order. Check the link and try again.' },
        404,
      );
    }
    return order;
  }

  async getStatusHistory(orderId: string): Promise<OrderStatusEvent[]> {
    await delay(260);
    const history = buildStatusHistory(orderId);
    if (!history.length) {
      throw new ApiError({ code: 'order_not_found', message: 'Order not found.' }, 404);
    }
    return history;
  }
}
