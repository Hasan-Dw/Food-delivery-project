import type { Promotion, PromotionValidation } from '@/types';
import { promotions } from '@/mocks/data/promotions';
import { delay } from '@/mocks/utils/delay';
import type { PromotionService, ValidatePromotionInput } from '@/services/promotions/PromotionService';
import { evaluatePreviewCoupon, PREVIEW_COUPONS } from './preview-coupons';

/** Preview-only coupon validation. The backend validates again at checkout. */
export class MockPromotionService implements PromotionService {
  async list(): Promise<Promotion[]> {
    await delay(320);
    return promotions;
  }

  async validate(input: ValidatePromotionInput): Promise<PromotionValidation> {
    await delay(240);

    const code = input.code.trim().toUpperCase();
    const knownPromotion = promotions.find((entry) => entry.code === code);
    const knownPreview = PREVIEW_COUPONS[code];

    if (!knownPromotion && !knownPreview) {
      return {
        valid: false,
        code,
        discount: 0,
        message: 'That code is not available in this preview.',
      };
    }

    if (knownPromotion && new Date(knownPromotion.expiresAt).getTime() < Date.now()) {
      return {
        valid: false,
        code,
        discount: 0,
        message: 'That offer has expired.',
      };
    }

    const subtotal = input.subtotal ?? 0;
    if (knownPromotion?.restaurantId && knownPromotion.restaurantId !== input.restaurantId) {
      return {
        valid: false,
        code,
        discount: 0,
        message: 'That code is only valid at its partner restaurant.',
      };
    }
    if (knownPromotion?.minOrder && subtotal < knownPromotion.minOrder) {
      return {
        valid: false,
        code,
        discount: 0,
        message: `Spend at least $${knownPromotion.minOrder.toFixed(2)} to use this code.`,
      };
    }

    const evaluation = evaluatePreviewCoupon(code, subtotal, 0);
    return {
      valid: true,
      code,
      title: knownPromotion?.title ?? evaluation.label ?? 'Promotion applied',
      description: knownPromotion?.description,
      discount: evaluation.discount,
      ...(evaluation.message ? { message: evaluation.message } : {}),
    };
  }
}
