import type { PromotionDocument } from './schemas/promotion.schema';
import { PromotionDiscountType } from '../common/enums/promotion.enum';
import { fromCents } from '../common/utils/money.util';
import type { PromotionResponse } from './interfaces/promotion-response.interface';

export function toPromotionResponse(
  promotion: PromotionDocument,
  options: { admin?: boolean } = {},
): PromotionResponse {
  const response: PromotionResponse = {
    id: promotion._id.toString(),
    title: promotion.title,
    subtitle: promotion.subtitle ?? '',
    description: promotion.description ?? '',
    code: promotion.code,
    imageKey: promotion.imageKey,
    expiresAt: promotion.expiresAt.toISOString(),
    accent: promotion.accent,
  };

  if (promotion.minOrderCents > 0) {
    response.minOrder = fromCents(promotion.minOrderCents);
  }
  if (promotion.restaurantId) {
    response.restaurantId = promotion.restaurantId.toString();
  }

  if (options.admin) {
    response.discountType = promotion.discountType;
    response.discountValue =
      promotion.discountType === PromotionDiscountType.PERCENTAGE
        ? promotion.percentOff ?? 0
        : fromCents(promotion.amountOffCents ?? 0);
    response.usageLimit = promotion.usageLimit;
    response.usageCount = promotion.usageCount;
    response.perCustomerLimit = promotion.perCustomerLimit;
    response.active = promotion.active;
  }

  return response;
}
