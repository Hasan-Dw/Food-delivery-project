import { PromotionDiscountType } from '../common/enums/promotion.enum';

export interface PromotionDiscountInput {
  discountType: string;
  percentOff?: number;
  amountOffCents?: number;
  /** 0 or undefined means no cap. */
  maxDiscountCents?: number;
  subtotalCents: number;
  deliveryFeeCents: number;
}

export interface PromotionDiscountResult {
  discountCents: number;
  freeDelivery: boolean;
}

/**
 * Single source of truth for coupon maths. Callers always pass server-computed
 * item totals, never browser-supplied amounts.
 */
export function computePromotionDiscount(
  input: PromotionDiscountInput,
): PromotionDiscountResult {
  const subtotalCents = Math.max(0, Math.floor(input.subtotalCents));
  const deliveryFeeCents = Math.max(0, Math.floor(input.deliveryFeeCents));
  const cap =
    input.maxDiscountCents && input.maxDiscountCents > 0
      ? Math.floor(input.maxDiscountCents)
      : undefined;

  let discountCents = 0;
  let freeDelivery = false;

  if (input.discountType === PromotionDiscountType.FREE_DELIVERY) {
    freeDelivery = true;
    discountCents = deliveryFeeCents;
  } else if (input.discountType === PromotionDiscountType.PERCENTAGE) {
    discountCents = Math.floor((subtotalCents * (input.percentOff ?? 0)) / 100);
  } else {
    discountCents = Math.min(input.amountOffCents ?? 0, subtotalCents);
  }

  if (cap !== undefined) {
    discountCents = Math.min(discountCents, cap);
  }

  // Never discount more than the amount the coupon is allowed to touch.
  const eligibleCents = freeDelivery ? deliveryFeeCents : subtotalCents;
  return {
    discountCents: Math.max(0, Math.min(discountCents, eligibleCents)),
    freeDelivery,
  };
}
