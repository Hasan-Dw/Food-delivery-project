import type { PromotionDocument } from '../schemas/promotion.schema';

/** Public/admin representation consumed by the Savora frontend. */
export interface PromotionResponse {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  code: string;
  imageKey: string;
  expiresAt: string;
  accent: string;
  minOrder?: number;
  restaurantId?: string;
  discountType?: string;
  /** Percent for PERCENTAGE, decimal currency for FIXED. */
  discountValue?: number;
  usageLimit?: number;
  usageCount?: number;
  perCustomerLimit?: number;
  active?: boolean;
}

export interface PromotionEvaluation {
  promotion: PromotionDocument;
  code: string;
  discountCents: number;
  title: string;
  description: string;
}

export interface PromotionPreview {
  valid: boolean;
  code: string;
  title?: string;
  description?: string;
  discount: number;
  message?: string;
}

export interface EvaluatePromotionInput {
  code: string;
  customerId: string;
  restaurantId?: string;
  subtotalCents: number;
}
