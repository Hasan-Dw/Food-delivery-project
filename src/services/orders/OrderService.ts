import type { Order, OrderStatusEvent } from '@/types';

export interface OrderService {
  list(): Promise<Order[]>;
  getActive(): Promise<Order | null>;
  getById(orderId: string): Promise<Order>;
  getStatusHistory(orderId: string): Promise<OrderStatusEvent[]>;
}
