import type { PromotionDocument } from './schemas/promotion.schema';
import {
  PromotionDiscountType,
  PromotionScope,
  PromotionStatus,
} from '../common/enums/promotion.enum';
import { fromCents } from '../common/utils/money.util';
import type { PromotionResponse } from './interfaces/promotion-response.interface';

export function promotionStatus(
  promotion: PromotionDocument,
  now = new Date(),
): PromotionStatus {
  if (promotion.expiresAt.getTime() <= now.getTime()) return PromotionStatus.EXPIRED;
  if (!promotion.active) return PromotionStatus.INACTIVE;
  if (promotion.startsAt && promotion.startsAt.getTime() > now.getTime()) {
    return PromotionStatus.SCHEDULED;
  }
  return PromotionStatus.ACTIVE;
}

export function promotionScope(promotion: PromotionDocument): PromotionScope {
  return promotion.restaurantId
    ? PromotionScope.RESTAURANT
    : PromotionScope.GLOBAL;
}

export function toPromotionResponse(
  promotion: PromotionDocument,
  options: {
    managed?: boolean;
    restaurantName?: string;
    discountGrantedCents?: number;
    redemptionCount?: number;
  } = {},
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
    scope: promotionScope(promotion),
    status: promotionStatus(promotion),
    discountType: promotion.discountType,
    discountValue:
      promotion.discountType === PromotionDiscountType.PERCENTAGE
        ? promotion.percentOff ?? 0
        : promotion.discountType === PromotionDiscountType.FIXED
          ? fromCents(promotion.amountOffCents ?? 0)
          : 0,
    freeDelivery: promotion.discountType === PromotionDiscountType.FREE_DELIVERY,
    firstOrderOnly: promotion.firstOrderOnly ?? false,
  };

  if (promotion.minOrderCents > 0) {
    response.minOrder = fromCents(promotion.minOrderCents);
  }
  if (promotion.maxDiscountCents > 0) {
    response.maxDiscount = fromCents(promotion.maxDiscountCents);
  }
  if (promotion.startsAt) {
    response.startsAt = promotion.startsAt.toISOString();
  }
  if (promotion.restaurantId) {
    response.restaurantId = promotion.restaurantId.toString();
  }
  if (options.restaurantName) {
    response.restaurantName = options.restaurantName;
  }

  if (options.managed) {
    response.usageLimit = promotion.usageLimit;
    response.usageCount = promotion.usageCount;
    response.perCustomerLimit = promotion.perCustomerLimit;
    response.active = promotion.active;
    response.discountGranted = fromCents(options.discountGrantedCents ?? 0);
    response.redemptionCount = options.redemptionCount ?? promotion.usageCount;
    if (promotion.createdBy) {
      response.createdBy = promotion.createdBy.toString();
    }
    response.createdAt = promotion.createdAt.toISOString();
    response.updatedAt = promotion.updatedAt.toISOString();
  }

  return response;
}
