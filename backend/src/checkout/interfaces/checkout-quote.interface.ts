import type { PromotionPreview } from '../../promotions/interfaces/promotion-response.interface';

export interface QuoteSelectedOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface QuoteLineItem {
  productId: string;
  name: string;
  imageKey: string;
  quantity: number;
  unitPrice: number;
  selectedOptions: QuoteSelectedOption[];
  notes?: string;
}

export interface CheckoutQuoteResponse {
  restaurantId: string;
  restaurantName: string;
  restaurantImageKey: string;
  items: QuoteLineItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  tax: number;
  total: number;
  minOrder: number;
  currency: 'USD';
  couponCode?: string;
  promotion?: PromotionPreview;
}
