import type {
  Promotion,
  PromotionDiscountType,
  PromotionStatus,
} from '@/types';

export const DISCOUNT_TYPE_LABELS: Record<PromotionDiscountType, string> = {
  PERCENTAGE: 'Percentage off',
  FIXED: 'Fixed amount off',
  FREE_DELIVERY: 'Free delivery',
};

export const PROMOTION_STATUS_LABELS: Record<PromotionStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  EXPIRED: 'Expired',
  SCHEDULED: 'Scheduled',
};

export function formatPromotionValue(promotion: Promotion): string {
  if (promotion.discountType === 'FREE_DELIVERY' || promotion.freeDelivery) {
    return 'Free delivery';
  }
  if (promotion.discountType === 'PERCENTAGE') {
    return `${promotion.discountValue ?? 0}% off`;
  }
  return `$${(promotion.discountValue ?? 0).toFixed(2)} off`;
}

export function formatPromotionLimit(promotion: Promotion): string {
  if (!promotion.usageLimit) return 'Unlimited uses';
  return `${promotion.usageCount ?? 0} / ${promotion.usageLimit} used`;
}

export function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateInputValue(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
