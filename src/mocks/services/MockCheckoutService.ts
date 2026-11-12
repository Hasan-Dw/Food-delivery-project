import type { CheckoutQuote, CheckoutQuoteLineItem, PromotionValidation } from '@/types';
import { products } from '@/mocks/data/products';
import { restaurants } from '@/mocks/data/restaurants';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { CheckoutQuoteInput, CheckoutService } from '@/services/checkout/CheckoutService';
import { evaluatePreviewCoupon } from './preview-coupons';

const SERVICE_FEE = 2.5;

/** Offline preview pricing. The real backend reprices every cart. */
export class MockCheckoutService implements CheckoutService {
  async quote(input: CheckoutQuoteInput): Promise<CheckoutQuote> {
    await delay(260);

    const restaurant = restaurants.find((entry) => entry.id === input.restaurantId);
    if (!restaurant) {
      throw new ApiError(
        { code: 'restaurant_unavailable', message: 'That restaurant is not available.' },
        404,
      );
    }

    const items: CheckoutQuoteLineItem[] = input.items.map((requested) => {
      const product = products.find((entry) => entry.id === requested.productId);
      if (!product || product.restaurantId !== restaurant.id) {
        throw new ApiError(
          { code: 'menu_item_unavailable', message: 'An item in your cart is unavailable.' },
          409,
        );
      }
      if (!product.available) {
        throw new ApiError(
          { code: 'menu_item_unavailable', message: `${product.name} is currently unavailable.` },
          409,
        );
      }

      let unitPrice = product.price;
      const selectedOptions = (requested.selectedOptions ?? []).map((selection) => {
        const group = product.optionGroups?.find((entry) => entry.id === selection.groupId);
        const option = group?.options.find((entry) => entry.id === selection.optionId);
        if (!group || !option) {
          throw new ApiError(
            { code: 'menu_option_unavailable', message: `An option for ${product.name} is no longer available.` },
            409,
          );
        }
        unitPrice += option.priceDelta;
        return {
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta,
        };
      });

      return {
        productId: product.id,
        name: product.name,
        imageKey: product.imageKey,
        quantity: requested.quantity,
        unitPrice: Math.round(unitPrice * 100) / 100,
        selectedOptions,
        ...(requested.notes ? { notes: requested.notes } : {}),
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryFee = restaurant.deliveryFee;

    let discount = 0;
    let promotion: PromotionValidation | undefined;
    if (input.couponCode) {
      const evaluation = evaluatePreviewCoupon(input.couponCode, subtotal, deliveryFee);
      discount = evaluation.valid ? evaluation.discount : 0;
      promotion = {
        valid: evaluation.valid,
        code: evaluation.code,
        discount,
        ...(evaluation.label ? { title: evaluation.label } : {}),
        ...(evaluation.message ? { message: evaluation.message } : {}),
      };
    }

    const total = subtotal + deliveryFee + SERVICE_FEE - discount;

    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantImageKey: restaurant.imageKey,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      deliveryFee,
      serviceFee: SERVICE_FEE,
      discount: Math.round(discount * 100) / 100,
      tax: 0,
      total: Math.round(total * 100) / 100,
      minOrder: restaurant.minOrder,
      currency: 'USD',
      ...(input.couponCode ? { couponCode: input.couponCode.trim().toUpperCase() } : {}),
      ...(promotion ? { promotion } : {}),
    };
  }
}
