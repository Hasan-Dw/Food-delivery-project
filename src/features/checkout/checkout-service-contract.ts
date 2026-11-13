import type { Address, Delivery, Order, SelectedOption } from '@/types';

export interface CheckoutOrderInput {
  idempotencyKey: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  restaurantId: string;
  items: Array<{
    productId: string;
    quantity: number;
    selectedOptions: SelectedOption[];
    notes?: string;
  }>;
  deliveryAddress: Address;
  paymentMethodId: string;
  couponCode?: string;
  notes?: string;
}

export interface CheckoutOrderServiceExtension {
  create(input: CheckoutOrderInput): Promise<Order>;
}

export interface CheckoutDeliveryServiceExtension {
  createForOrder(input: { idempotencyKey: string; orderId: string }): Promise<Delivery>;
}
