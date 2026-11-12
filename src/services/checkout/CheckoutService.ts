import type { CheckoutQuote, SelectedOption } from '@/types';

export interface CheckoutQuoteItemInput {
  productId: string;
  quantity: number;
  selectedOptions?: SelectedOption[];
  notes?: string;
}

export interface CheckoutQuoteInput {
  restaurantId: string;
  items: CheckoutQuoteItemInput[];
  couponCode?: string;
}

/**
 * Server-authoritative checkout pricing. The cart in the browser is a draft;
 * every price, fee, availability flag and discount is recalculated here.
 */
export interface CheckoutService {
  quote(input: CheckoutQuoteInput): Promise<CheckoutQuote>;
}
