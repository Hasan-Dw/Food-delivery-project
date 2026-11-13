/**
 * Preview-only coupon rules used when `VITE_DATA_SOURCE=mock`.
 *
 * In HTTP mode the backend owns every promotion rule. This module exists only
 * so the offline preview can demonstrate the checkout flow; it is never the
 * source of truth for a real order.
 */
export interface PreviewCoupon {
  label: string;
  kind: 'percent' | 'free_delivery' | 'none';
  /** 0.2 means 20% off. */
  value: number;
}

export const PREVIEW_COUPONS: Record<string, PreviewCoupon> = {
  HELLO25: { label: 'Free delivery', kind: 'free_delivery', value: 1 },
  SLICE20: { label: '20% off', kind: 'percent', value: 0.2 },
  SWEET6: { label: 'Free cookie box', kind: 'none', value: 0 },
  GREENS3: { label: '$3 off', kind: 'none', value: 0 },
};

export interface PreviewCouponEvaluation {
  valid: boolean;
  code: string;
  label?: string;
  discount: number;
  message?: string;
}

export function evaluatePreviewCoupon(
  rawCode: string,
  subtotal: number,
  deliveryFee: number,
): PreviewCouponEvaluation {
  const code = rawCode.trim().toUpperCase();
  const coupon = PREVIEW_COUPONS[code];

  if (!coupon) {
    return {
      valid: false,
      code,
      discount: 0,
      message: 'That code is not available in this preview.',
    };
  }

  const discount =
    coupon.kind === 'free_delivery'
      ? deliveryFee
      : coupon.kind === 'percent'
        ? subtotal * coupon.value
        : 0;

  return {
    valid: true,
    code,
    label: coupon.label,
    discount: Math.round(discount * 100) / 100,
    message: coupon.kind === 'none' ? 'This reward is applied by the restaurant.' : undefined,
  };
}
