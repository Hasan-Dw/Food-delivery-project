import type { Order, OrderStatusEvent } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { OrderService } from './OrderService';

export class HttpOrderService implements OrderService {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<Order[]> {
    const response = await this.client.get<Order[]>('/orders');
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

  async getStatusHistory(orderId: string): Promise<OrderStatusEvent[]> {
    const response = await this.client.get<OrderStatusEvent[]>(
      `/orders/${encodeURIComponent(orderId)}/status-history`,
    );
    return response.data;
  }
}
