import type { Order, OrderAction, TrackingEvent } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { CreateOrderInput, OrderListQuery, OrderService } from './OrderService';

/**
 * The API rejects unknown fields, so the browser's checkout draft is reduced to
 * the exact create-order contract. Prices, fees and discounts are never sent;
 * the backend recalculates them.
 */
function toCreateOrderPayload(input: CreateOrderInput) {
  return {
    idempotencyKey: input.idempotencyKey,
    restaurantId: input.restaurantId,
    items: input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedOptions: (item.selectedOptions ?? []).map((option) => ({
        groupId: option.groupId,
        optionId: option.optionId,
      })),
      ...(item.notes ? { notes: item.notes } : {}),
    })),
    deliveryAddress: {
      label: input.deliveryAddress.label,
      line1: input.deliveryAddress.line1,
      ...(input.deliveryAddress.line2 ? { line2: input.deliveryAddress.line2 } : {}),
      city: input.deliveryAddress.city,
      state: input.deliveryAddress.state,
      postalCode: input.deliveryAddress.postalCode,
      country: input.deliveryAddress.country,
      ...(input.deliveryAddress.instructions
        ? { instructions: input.deliveryAddress.instructions }
        : {}),
      ...(input.deliveryAddress.coordinates
        ? {
            lat: input.deliveryAddress.coordinates.lat,
            lng: input.deliveryAddress.coordinates.lng,
          }
        : {}),
    },
    paymentMethodId: input.paymentMethodId,
    ...(input.customerName ? { customerName: input.customerName } : {}),
    ...(input.customerPhone ? { customerPhone: input.customerPhone } : {}),
    ...(input.couponCode ? { couponCode: input.couponCode } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };
}

export class HttpOrderService implements OrderService {
  constructor(private readonly client: ApiClient) {}

  async list(query?: OrderListQuery): Promise<Order[]> {
    const response = await this.client.get<Order[]>('/orders', {
      query: {
        restaurantId: query?.restaurantId,
        customerId: query?.customerId,
        status: query?.status,
      },
    });
    return response.data;
  }

  async getActive(): Promise<Order | null> {
    const response = await this.client.get<Order | null>('/orders/active');
    return response.data ?? null;
  }

  async getById(orderId: string): Promise<Order> {
    const response = await this.client.get<Order>(`/orders/${encodeURIComponent(orderId)}`);
    return response.data;
  }

  async getStatusHistory(orderId: string): Promise<TrackingEvent[]> {
    const response = await this.client.get<TrackingEvent[]>(
      `/orders/${encodeURIComponent(orderId)}/history`,
    );
    return response.data;
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const response = await this.client.post<Order>(
      '/orders',
      toCreateOrderPayload(input),
    );
    return response.data;
  }

  async transition(orderId: string, action: OrderAction): Promise<Order> {
    const response = await this.client.post<Order>(
      `/orders/${encodeURIComponent(orderId)}/transition`,
      { action },
    );
    return response.data;
  }
}
