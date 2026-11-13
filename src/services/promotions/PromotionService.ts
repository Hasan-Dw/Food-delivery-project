import type { Promotion, PromotionValidation } from '@/types';

export interface ValidatePromotionInput {
  code: string;
  restaurantId?: string;
  /** Display-only subtotal for the preview. Order creation recalculates it. */
  subtotal?: number;
}

export interface PromotionService {
  list(): Promise<Promotion[]>;
  /** Server-side coupon preview. Order creation validates the code again. */
  validate(input: ValidatePromotionInput): Promise<PromotionValidation>;
}
