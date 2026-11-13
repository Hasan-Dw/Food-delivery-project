import type {
  Address,
  AddressLabel,
  Order,
  OrderAction,
  OrderItem,
  TrackingEvent,
} from '@/types';
import { orders } from '@/mocks/data/orders';
import { findDeliveryByOrder } from '@/mocks/data/deliveries';
import { drivers } from '@/mocks/data/drivers';
import { products } from '@/mocks/data/products';
import { restaurants } from '@/mocks/data/restaurants';
import { paymentMethods } from '@/mocks/data/user';
import { buildStatusHistory } from '@/mocks/data/tracking';
import {
  canTransitionOrderStatus,
  isTerminalOrderStatus,
  orderActionStatus,
} from '@/lib/order-lifecycle';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type {
  CreateOrderInput,
  OrderListQuery,
  OrderService,
} from '@/services/orders/OrderService';
import { attemptAutoAssignment, retryPendingAssignmentsForDriver } from './assignment-engine';
import { evaluatePreviewCoupon } from './preview-coupons';

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

  async create(input: CreateOrderInput): Promise<Order> {
    await delay(360);

    const restaurant = restaurants.find((entry) => entry.id === input.restaurantId);
    if (!restaurant) {
      throw new ApiError(
        { code: 'restaurant_unavailable', message: 'That restaurant is not available.' },
        404,
      );
    }

    const items: OrderItem[] = input.items.map((requested, index) => {
      const product = products.find((entry) => entry.id === requested.productId);
      if (!product || product.restaurantId !== restaurant.id) {
        throw new ApiError(
          { code: 'menu_item_unavailable', message: 'An item in your cart is unavailable.' },
          409,
        );
      }
      if (!product.available) {
        throw new ApiError(
          { code: 'menu_item_unavailable', message: `${product.name} is currently unavailable.` },
          409,
        );
      }

      let unitPrice = product.price;
      const selectedOptions = (requested.selectedOptions ?? []).map((selection) => {
        const group = product.optionGroups?.find((entry) => entry.id === selection.groupId);
        const option = group?.options.find((entry) => entry.id === selection.optionId);
        if (!group || !option) {
          throw new ApiError(
            { code: 'menu_option_unavailable', message: `An option for ${product.name} is no longer available.` },
            409,
          );
        }
        unitPrice += option.priceDelta;
        return {
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta,
        };
      });

      return {
        id: `oi_new_${Date.now()}_${index}`,
        productId: product.id,
        name: product.name,
        imageKey: product.imageKey,
        quantity: requested.quantity,
        unitPrice: Math.round(unitPrice * 100) / 100,
        selectedOptions,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryFee = restaurant.deliveryFee;
    const serviceFee = 2.5;

    let discount = 0;
    if (input.couponCode) {
      const evaluation = evaluatePreviewCoupon(input.couponCode, subtotal, deliveryFee);
      if (!evaluation.valid) {
        throw new ApiError(
          { code: 'promotion_invalid', message: evaluation.message ?? 'That promotion cannot be used.' },
          409,
        );
      }
      discount = evaluation.discount;
    }

    const now = new Date().toISOString();
    const sequence = 10500 + orders.length;
    const address: Address = {
      id: `addr_checkout_${Date.now()}`,
      label: input.deliveryAddress.label as AddressLabel,
      line1: input.deliveryAddress.line1,
      ...(input.deliveryAddress.line2 ? { line2: input.deliveryAddress.line2 } : {}),
      city: input.deliveryAddress.city,
      state: input.deliveryAddress.state,
      postalCode: input.deliveryAddress.postalCode,
      country: input.deliveryAddress.country,
      ...(input.deliveryAddress.instructions
        ? { instructions: input.deliveryAddress.instructions }
        : {}),
      isDefault: false,
      ...(input.deliveryAddress.coordinates
        ? { coordinates: input.deliveryAddress.coordinates }
        : {}),
    };

    const order: Order = {
      id: `ord_new_${Date.now()}`,
      code: `SV-${sequence}`,
      customerId: input.customerId ?? 'usr_maya_bennett',
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantImageKey: restaurant.imageKey,
      items,
      status: 'PENDING',
      placedAt: now,
      deliveryAddress: address,
      totals: {
        subtotal: Math.round(subtotal * 100) / 100,
        deliveryFee,
        serviceFee,
        discount: Math.round(discount * 100) / 100,
        tax: 0,
        total: Math.round((subtotal + deliveryFee + serviceFee - discount) * 100) / 100,
      },
      paymentMethod:
        paymentMethods.find((method) => method.id === input.paymentMethodId) ?? {
          id: input.paymentMethodId,
          type: 'cash',
          label: 'Cash on delivery',
          isDefault: false,
        },
      ...(input.couponCode ? { couponCode: input.couponCode.trim().toUpperCase() } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };

    orders.unshift(order);
    return order;
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
