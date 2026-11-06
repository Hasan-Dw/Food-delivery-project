import type { ID, Order, OrderAction, OrderStatus, TrackingEvent } from '@/types';

/** Filters supported by the orders list. A backend may add more; these map to query params. */
export interface OrderListQuery {
  restaurantId?: ID;
  customerId?: ID;
  status?: OrderStatus;
}

/**
 * Customer purchase lifecycle. Delivery transportation is a separate service
 * (`DeliveryService`); this contract never owns driver assignment or GPS.
 */
export interface OrderService {
  list(query?: OrderListQuery): Promise<Order[]>;
  getActive(): Promise<Order | null>;
  getById(orderId: string): Promise<Order>;
  getStatusHistory(orderId: string): Promise<TrackingEvent[]>;
  /** Role-authorized lifecycle action. The backend must re-check the role. */
  transition(orderId: string, action: OrderAction): Promise<Order>;
}
