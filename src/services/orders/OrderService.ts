import type { ID, Order, OrderAction, OrderStatus, SelectedOption, TrackingEvent } from '@/types';

/** Filters supported by the orders list. A backend may add more; these map to query params. */
export interface OrderListQuery {
  restaurantId?: ID;
  customerId?: ID;
  status?: OrderStatus;
}

/**
 * Server-accepted checkout item. Only ids are trusted; names and prices are
 * recalculated by the API.
 */
export interface CreateOrderItemInput {
  productId: ID;
  quantity: number;
  selectedOptions?: SelectedOption[];
  notes?: string;
}

/**
 * Checkout submission. `customerId` remains for the mock adapter; the HTTP
 * adapter drops it because the backend derives the customer from the token.
 */
export interface CreateOrderInput {
  idempotencyKey: string;
  customerId?: ID;
  customerName?: string;
  customerPhone?: string;
  restaurantId: ID;
  items: CreateOrderItemInput[];
  deliveryAddress: {
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    instructions?: string;
    coordinates?: { lat: number; lng: number };
  };
  paymentMethodId: string;
  couponCode?: string;
  notes?: string;
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
  /** Create an order from a cart. The server reprices and validates everything. */
  create(input: CreateOrderInput): Promise<Order>;
  /** Role-authorized lifecycle action. The backend must re-check the role. */
  transition(orderId: string, action: OrderAction): Promise<Order>;
}
