import { Badge } from '@/components/ui/Badge';
import type { PromotionStatus } from '@/types';
import { PROMOTION_STATUS_LABELS } from './coupon';

const tones = {
  ACTIVE: 'success',
  SCHEDULED: 'gold',
  INACTIVE: 'cream',
  EXPIRED: 'outline',
} as const;

export function CouponStatusBadge({ status }: { status?: PromotionStatus }) {
  if (!status) return null;
  return <Badge tone={tones[status]}>{PROMOTION_STATUS_LABELS[status]}</Badge>;
}
