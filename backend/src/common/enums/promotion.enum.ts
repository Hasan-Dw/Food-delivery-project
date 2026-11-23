export enum PromotionDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  FREE_DELIVERY = 'FREE_DELIVERY',
}

export enum PromotionAccent {
  TERRACOTTA = 'terracotta',
  OLIVE = 'olive',
  GOLD = 'gold',
}

/** Ownership scope. The scope is always derived from the restaurant link. */
export enum PromotionScope {
  GLOBAL = 'GLOBAL',
  RESTAURANT = 'RESTAURANT',
}

/**
 * Effective coupon state. `EXPIRED` wins over `INACTIVE` because an elapsed
 * campaign is no longer redeemable regardless of the manual flag.
 */
export enum PromotionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  SCHEDULED = 'SCHEDULED',
}
