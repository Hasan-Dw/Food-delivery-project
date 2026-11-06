import type { Order, OrderAction, TrackingEvent } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { OrderListQuery, OrderService } from './OrderService';

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
      `/orders/${encodeURIComponent(orderId)}/status-history`,
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
