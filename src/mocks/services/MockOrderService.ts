import type { Order, OrderAction, TrackingEvent } from '@/types';
import { orders } from '@/mocks/data/orders';
import { findDeliveryByOrder } from '@/mocks/data/deliveries';
import { drivers } from '@/mocks/data/drivers';
import { buildStatusHistory } from '@/mocks/data/tracking';
import {
  canTransitionOrderStatus,
  isTerminalOrderStatus,
  orderActionStatus,
} from '@/lib/order-lifecycle';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { OrderListQuery, OrderService } from '@/services/orders/OrderService';
import { attemptAutoAssignment, retryPendingAssignmentsForDriver } from './assignment-engine';

export class MockOrderService implements OrderService {
  async list(query?: OrderListQuery): Promise<Order[]> {
    await delay(420);
    return orders
      .filter((order) => {
        if (query?.restaurantId && order.restaurantId !== query.restaurantId) return false;
        if (query?.customerId && order.customerId !== query.customerId) return false;
        if (query?.status && order.status !== query.status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
  }

  async getActive(): Promise<Order | null> {
    await delay(320);
    return orders.find((order) => !isTerminalOrderStatus(order.status)) ?? null;
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

  async getStatusHistory(orderId: string): Promise<TrackingEvent[]> {
    await delay(260);
    const history = buildStatusHistory(orderId);
    if (!history.length) {
      throw new ApiError({ code: 'order_not_found', message: 'Order not found.' }, 404);
    }
    return history;
  }

  async transition(orderId: string, action: OrderAction): Promise<Order> {
    await delay(320);
    const order = orders.find((entry) => entry.id === orderId || entry.code === orderId);
    if (!order) {
      throw new ApiError({ code: 'order_not_found', message: 'Order not found.' }, 404);
    }

    if (action === 'COMPLETE') {
      throw new ApiError(
        {
          code: 'manual_completion_forbidden',
          message: 'Orders are completed by a successful delivery, not by a manual status change.',
        },
        422,
      );
    }

    const nextStatus = orderActionStatus[action];
    if (!canTransitionOrderStatus(order.status, nextStatus)) {
      throw new ApiError(
        {
          code: 'invalid_order_transition',
          message: `An order in ${order.status} cannot transition to ${nextStatus}.`,
        },
        409,
      );
    }

    const at = new Date().toISOString();
    order.status = nextStatus;
    if (nextStatus === 'ACCEPTED') order.acceptedAt = at;
    if (nextStatus === 'PREPARING') order.preparingAt = at;
    if (nextStatus === 'READY') order.readyAt = at;
    if (nextStatus === 'COMPLETED') order.completedAt = at;
    if (nextStatus === 'REJECTED') order.rejectedAt = at;
    if (nextStatus === 'CANCELLED') order.cancelledAt = at;

    if (nextStatus === 'REJECTED' || nextStatus === 'CANCELLED') {
      this.cancelDelivery(order.id, at);
    }

    if (nextStatus === 'READY') {
      const delivery = findDeliveryByOrder(order.id);
      if (delivery) {
        // Fire-and-forget side effect of the transition. It is idempotent and
        // bounded, so a state refresh cannot create an assignment loop.
        attemptAutoAssignment(delivery.id, { trigger: 'ORDER_READY' });
      }
    }

    return order;
  }

  private cancelDelivery(orderId: string, at: string): void {
    const delivery = findDeliveryByOrder(orderId);
    if (!delivery || delivery.status === 'CANCELLED' || delivery.status === 'DELIVERED') return;

    delivery.status = 'CANCELLED';
    delivery.cancelledAt = at;
    delivery.updatedAt = at;
    delivery.estimatedArrivalAt = undefined;
    delivery.driverLocation = null;

    if (delivery.driverId) {
      const driver = drivers.find((entry) => entry.id === delivery.driverId);
      if (driver && driver.activeDeliveryId === delivery.id) {
        driver.activeDeliveryId = null;
        driver.availability = driver.accountStatus === 'APPROVED' ? 'AVAILABLE' : 'OFFLINE';
        if (driver.availability === 'AVAILABLE') {
          retryPendingAssignmentsForDriver(driver.id);
        }
      }
    }
  }
}
