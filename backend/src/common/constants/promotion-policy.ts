/**
 * Platform limits for restaurant-owned coupons. Global coupons are managed by
 * the administrator and use the wider DTO bounds, but restaurant owners can
 * never exceed these values through the owner API.
 *
 * Keep these values in sync with the owner coupon form hints. They are exposed
 * to the dashboard through `GET /restaurant-promotions/policy` rather than
 * being duplicated in the browser.
 */
export const PROMOTION_POLICY = {
  maxPercentage: 100,
  maxFixedDiscount: 1000,
  maxDiscountCap: 1000,
  maxMinimumOrder: 1000,
  maxTotalUses: 100_000,
  maxUsesPerCustomer: 100,
} as const;

export type PromotionPolicy = {
  -readonly [Key in keyof typeof PROMOTION_POLICY]: (typeof PROMOTION_POLICY)[Key];
};
