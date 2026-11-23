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
  restaurantName?: string;
  discountType?: string;
  /** Percent for PERCENTAGE, decimal currency for FIXED, 0 for FREE_DELIVERY. */
  discountValue?: number;
  maxDiscount?: number;
  freeDelivery?: boolean;
  startsAt?: string;
  scope?: string;
  status?: string;
  firstOrderOnly?: boolean;
  usageLimit?: number;
  usageCount?: number;
  perCustomerLimit?: number;
  active?: boolean;
  discountGranted?: number;
  redemptionCount?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromotionEvaluation {
  promotion: PromotionDocument;
  code: string;
  discountCents: number;
  freeDelivery: boolean;
  title: string;
  description: string;
}

export interface PromotionPreview {
  valid: boolean;
  code: string;
  title?: string;
  description?: string;
  discount: number;
  discountType?: string;
  freeDelivery?: boolean;
  message?: string;
}

export interface EvaluatePromotionInput {
  code: string;
  customerId: string;
  restaurantId?: string;
  subtotalCents: number;
  deliveryFeeCents?: number;
}

export interface PromotionUsageRedemptionResponse {
  id: string;
  orderId: string;
  code: string;
  discount: number;
  redeemedAt: string;
}

export interface PromotionUsageResponse {
  promotion: PromotionResponse;
  totalRedemptions: number;
  totalDiscount: number;
  lastRedeemedAt?: string;
  recent: PromotionUsageRedemptionResponse[];
}
