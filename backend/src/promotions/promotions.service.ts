import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { PromotionAccent, PromotionDiscountType } from '../common/enums/promotion.enum';
import { fromCents, toCents } from '../common/utils/money.util';
import type { CreatePromotionDto } from './dto/create-promotion.dto';
import type { UpdatePromotionDto } from './dto/update-promotion.dto';
import type {
  EvaluatePromotionInput,
  PromotionEvaluation,
  PromotionPreview,
  PromotionResponse,
} from './interfaces/promotion-response.interface';
import { toPromotionResponse } from './promotion.mapper';
import {
  Promotion,
  PromotionRedemption,
  type PromotionDocument,
  type PromotionRedemptionDocument,
} from './schemas/promotion.schema';

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
    @InjectModel(PromotionRedemption.name)
    private readonly redemptionModel: Model<PromotionRedemptionDocument>,
  ) {}

  async listPublic(restaurantId?: string): Promise<PromotionResponse[]> {
    const now = new Date();
    const filter: FilterQuery<PromotionDocument> = {
      active: true,
      expiresAt: { $gt: now },
    };

    if (restaurantId && Types.ObjectId.isValid(restaurantId)) {
      filter.$or = [
        { restaurantId: null },
        { restaurantId: { $exists: false } },
        { restaurantId: new Types.ObjectId(restaurantId) },
      ];
    }

    const promotions = await this.promotionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    return promotions.map((promotion) => toPromotionResponse(promotion));
  }

  async listAdmin(): Promise<PromotionResponse[]> {
    const promotions = await this.promotionModel
      .find()
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();

    return promotions.map((promotion) => toPromotionResponse(promotion, { admin: true }));
  }

  async create(adminId: string, dto: CreatePromotionDto): Promise<PromotionResponse> {
    const expiresAt = new Date(dto.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: 'promotion_expiry_invalid',
        message: 'A promotion must expire in the future.',
        details: { expiresAt: ['Choose a future date and time.'] },
      });
    }

    const money = this.normaliseDiscount(dto.discountType, dto.value);

    try {
      const promotion = await this.promotionModel.create({
        code: normaliseCode(dto.code),
        title: dto.title.trim(),
        subtitle: dto.subtitle?.trim() ?? '',
        description: dto.description?.trim() ?? '',
        imageKey: dto.imageKey ?? 'offer-default',
        accent: dto.accent ?? PromotionAccent.TERRACOTTA,
        discountType: dto.discountType,
        percentOff: money.percentOff,
        amountOffCents: money.amountOffCents,
        minOrderCents: dto.minOrder ? toCents(dto.minOrder) : 0,
        expiresAt,
        restaurantId: dto.restaurantId ? new Types.ObjectId(dto.restaurantId) : null,
        usageLimit: dto.usageLimit ?? 0,
        perCustomerLimit: dto.perCustomerLimit ?? 1,
        active: dto.active ?? true,
        createdBy: new Types.ObjectId(adminId),
      });

      return toPromotionResponse(promotion, { admin: true });
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new ConflictException({
          code: 'promotion_code_taken',
          message: 'That promotion code is already in use.',
          details: { code: ['Already in use.'] },
        });
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<PromotionResponse> {
    const promotion = await this.getDocument(id);

    if (dto.code !== undefined) {
      const code = normaliseCode(dto.code);
      if (code !== promotion.code) {
        const existing = await this.promotionModel.exists({ code, _id: { $ne: promotion._id } });
        if (existing) {
          throw new ConflictException({
            code: 'promotion_code_taken',
            message: 'That promotion code is already in use.',
            details: { code: ['Already in use.'] },
          });
        }
        promotion.code = code;
      }
    }

    if (dto.title !== undefined) promotion.title = dto.title.trim();
    if (dto.subtitle !== undefined) promotion.subtitle = dto.subtitle.trim();
    if (dto.description !== undefined) promotion.description = dto.description.trim();
    if (dto.imageKey !== undefined) promotion.imageKey = dto.imageKey;
    if (dto.accent !== undefined) promotion.accent = dto.accent;
    if (dto.minOrder !== undefined) promotion.minOrderCents = toCents(dto.minOrder);
    if (dto.active !== undefined) promotion.active = dto.active;
    if (dto.restaurantId !== undefined) {
      promotion.restaurantId = dto.restaurantId
        ? new Types.ObjectId(dto.restaurantId)
        : null;
    }
    if (dto.expiresAt !== undefined) {
      const expiresAt = new Date(dto.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        throw new BadRequestException({
          code: 'promotion_expiry_invalid',
          message: 'The expiry date is not valid.',
        });
      }
      promotion.expiresAt = expiresAt;
    }
    if (dto.usageLimit !== undefined) {
      if (dto.usageLimit > 0 && dto.usageLimit < promotion.usageCount) {
        throw new ConflictException({
          code: 'promotion_usage_limit_below_usage',
          message: 'The usage limit cannot be lower than the number of redemptions already made.',
        });
      }
      promotion.usageLimit = dto.usageLimit;
    }
    if (dto.perCustomerLimit !== undefined) {
      promotion.perCustomerLimit = dto.perCustomerLimit;
    }

    const discountType = (dto.discountType ?? promotion.discountType) as PromotionDiscountType;
    if (dto.discountType !== undefined || dto.value !== undefined) {
      const fallbackValue =
        promotion.discountType === PromotionDiscountType.PERCENTAGE
          ? promotion.percentOff
          : fromCents(promotion.amountOffCents ?? 0);
      const value = dto.value ?? fallbackValue;
      if (value === undefined) {
        throw new BadRequestException({
          code: 'promotion_discount_invalid',
          message: 'A promotion value is required.',
        });
      }
      const money = this.normaliseDiscount(discountType, value);
      promotion.discountType = discountType;
      promotion.percentOff = money.percentOff;
      promotion.amountOffCents = money.amountOffCents;
    }

    await promotion.save();
    return toPromotionResponse(promotion, { admin: true });
  }

  /** Soft-deactivate. Redemptions and historical orders are never rewritten. */
  async deactivate(id: string): Promise<PromotionResponse> {
    const promotion = await this.getDocument(id);
    promotion.active = false;
    await promotion.save();
    return toPromotionResponse(promotion, { admin: true });
  }

  async getDocument(id: string): Promise<PromotionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException({
        code: 'promotion_not_found',
        message: 'That promotion could not be found.',
      });
    }

    const promotion = await this.promotionModel.findById(id).exec();
    if (!promotion) {
      throw new NotFoundException({
        code: 'promotion_not_found',
        message: 'That promotion could not be found.',
      });
    }
    return promotion;
  }

  /**
   * Validate a code against server-computed totals. Throws a typed error that
   * the checkout quote converts into an inline message and order creation
   * surfaces as a hard failure.
   */
  async evaluate(input: EvaluatePromotionInput): Promise<PromotionEvaluation> {
    const code = normaliseCode(input.code);
    const promotion = await this.promotionModel.findOne({ code }).exec();

    if (!promotion || !promotion.active) {
      throw new BadRequestException({
        code: 'promotion_invalid',
        message: 'That promotion code is not valid.',
      });
    }

    const now = Date.now();
    if (promotion.expiresAt.getTime() <= now) {
      throw new ConflictException({
        code: 'promotion_expired',
        message: 'That promotion has expired.',
      });
    }

    if (
      input.restaurantId &&
      promotion.restaurantId &&
      promotion.restaurantId.toString() !== input.restaurantId
    ) {
      throw new ConflictException({
        code: 'promotion_not_applicable',
        message: 'That promotion is not available for this restaurant.',
      });
    }

    if (input.subtotalCents < promotion.minOrderCents) {
      throw new ConflictException({
        code: 'promotion_minimum_not_met',
        message: `This promotion needs a subtotal of at least $${fromCents(
          promotion.minOrderCents,
        ).toFixed(2)}.`,
      });
    }

    if (promotion.usageLimit > 0 && promotion.usageCount >= promotion.usageLimit) {
      throw new ConflictException({
        code: 'promotion_usage_limit',
        message: 'That promotion has reached its usage limit.',
      });
    }

    const usedByCustomer = await this.redemptionModel.countDocuments({
      promotionId: promotion._id,
      customerId: new Types.ObjectId(input.customerId),
    });
    if (usedByCustomer >= promotion.perCustomerLimit) {
      throw new ConflictException({
        code: 'promotion_customer_limit',
        message: 'You have already used this promotion the maximum number of times.',
      });
    }

    const discountCents =
      promotion.discountType === PromotionDiscountType.PERCENTAGE
        ? Math.floor((input.subtotalCents * (promotion.percentOff ?? 0)) / 100)
        : Math.min(promotion.amountOffCents ?? 0, input.subtotalCents);

    return {
      promotion,
      code,
      discountCents: Math.max(0, discountCents),
      title: promotion.title,
      description: promotion.description ?? '',
    };
  }

  /** Never throws for an invalid code; used by the checkout quote UI. */
  async preview(input: EvaluatePromotionInput): Promise<PromotionPreview> {
    try {
      const evaluation = await this.evaluate(input);
      return {
        valid: true,
        code: evaluation.code,
        title: evaluation.title,
        description: evaluation.description,
        discount: fromCents(evaluation.discountCents),
      };
    } catch (error) {
      const response = error as { message?: string; response?: { message?: string } };
      return {
        valid: false,
        code: normaliseCode(input.code),
        discount: 0,
        message:
          response.response?.message ?? response.message ?? 'That promotion code is not valid.',
      };
    }
  }

  /**
   * Atomically count a redemption. Total usage is guarded by a compare-and-set
   * update; per-customer usage is checked before the increment.
   */
  async redeem(
    evaluation: PromotionEvaluation,
    orderId: string,
    customerId: string,
    discountCents: number,
  ): Promise<void> {
    const { promotion } = evaluation;
    const now = new Date();

    const updated = await this.promotionModel
      .findOneAndUpdate(
        {
          _id: promotion._id,
          active: true,
          expiresAt: { $gt: now },
          $or: [
            { usageLimit: 0 },
            { $expr: { $lt: ['$usageCount', '$usageLimit'] } },
          ],
        },
        { $inc: { usageCount: 1 } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException({
        code: 'promotion_usage_limit',
        message: 'That promotion is no longer available.',
      });
    }

    try {
      await this.redemptionModel.create({
        promotionId: promotion._id,
        customerId: new Types.ObjectId(customerId),
        orderId: new Types.ObjectId(orderId),
        code: evaluation.code,
        discountCents,
      });
    } catch (error) {
      await this.promotionModel
        .updateOne(
          { _id: promotion._id, usageCount: { $gt: 0 } },
          { $inc: { usageCount: -1 } },
        )
        .exec();
      throw error;
    }
  }

  /** Release a redemption when an order is cancelled or creation rolls back. */
  async releaseForOrder(orderId: string): Promise<void> {
    if (!Types.ObjectId.isValid(orderId)) return;

    const redemption = await this.redemptionModel
      .findOneAndDelete({ orderId: new Types.ObjectId(orderId) })
      .exec();

    if (redemption) {
      await this.promotionModel
        .updateOne(
          { _id: redemption.promotionId, usageCount: { $gt: 0 } },
          { $inc: { usageCount: -1 } },
        )
        .exec();
    }
  }

  private normaliseDiscount(
    discountType: PromotionDiscountType,
    value: number,
  ): { percentOff?: number; amountOffCents?: number } {
    if (discountType === PromotionDiscountType.PERCENTAGE) {
      const percent = Math.floor(value);
      if (percent < 1 || percent > 100) {
        throw new BadRequestException({
          code: 'promotion_discount_invalid',
          message: 'A percentage promotion must be between 1 and 100.',
        });
      }
      return { percentOff: percent };
    }

    const amountOffCents = toCents(value);
    if (amountOffCents < 1) {
      throw new BadRequestException({
        code: 'promotion_discount_invalid',
        message: 'A fixed promotion must be greater than zero.',
      });
    }
    return { amountOffCents };
  }
}
