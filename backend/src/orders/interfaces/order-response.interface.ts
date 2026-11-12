export interface OrderItemOptionResponse {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface OrderItemResponse {
  id: string;
  productId: string;
  name: string;
  imageKey: string;
  quantity: number;
  unitPrice: number;
  selectedOptions?: OrderItemOptionResponse[];
}

export interface OrderTotalsResponse {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  tax: number;
  total: number;
}

export interface OrderPaymentMethodResponse {
  id: string;
  type: string;
  label: string;
  brand?: string;
  last4?: string;
  expiry?: string;
  isDefault: boolean;
}

export interface OrderAddressResponse {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  instructions?: string;
  isDefault: boolean;
  coordinates?: { lat: number; lng: number };
}

export interface OrderResponse {
  id: string;
  code: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImageKey: string;
  items: OrderItemResponse[];
  status: string;
  placedAt: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  deliveryAddress: OrderAddressResponse;
  deliveryId?: string;
  totals: OrderTotalsResponse;
  paymentMethod: OrderPaymentMethodResponse;
  couponCode?: string;
  notes?: string;
}
