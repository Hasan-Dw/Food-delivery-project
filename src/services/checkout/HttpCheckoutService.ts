import type { CheckoutQuote } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { CheckoutQuoteInput, CheckoutService } from './CheckoutService';

export class HttpCheckoutService implements CheckoutService {
  constructor(private readonly client: ApiClient) {}

  async quote(input: CheckoutQuoteInput): Promise<CheckoutQuote> {
    const response = await this.client.post<CheckoutQuote>('/checkout/quote', {
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
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
    });
    return response.data;
  }
}
