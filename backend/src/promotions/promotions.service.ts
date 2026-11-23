import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { PROMOTION_POLICY } from '../common/constants/promotion-policy';
import { OrderStatus } from '../common/enums/order.enum';
import {
  PromotionDiscountType,
  PromotionScope,
  PromotionStatus,
} from '../common/enums/promotion.enum';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { fromCents, toCents } from '../common/utils/money.util';
import { Order, type OrderDocument } from '../orders/schemas/order.schema';
import {
  Restaurant,
  type RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import type { CreatePromotionDto } from './dto/create-promotion.dto';
import type { PromotionQueryDto } from './dto/promotion-query.dto';
import type { UpdatePromotionDto } from './dto/update-promotion.dto';
import type {
  EvaluatePromotionInput,
  PromotionEvaluation,
  PromotionPreview,
  PromotionResponse,
  PromotionUsageResponse,
} from './interfaces/promotion-response.interface';
import { promotionStatus, toPromotionResponse } from './promotion.mapper';
import { computePromotionDiscount } from './promotion-discount.util';
import {
  Promotion,
  PromotionCustomerUsage,
  PromotionRedemption,
  type PromotionCustomerUsageDocument,
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) return fallback;
  const candidate = error as {
    message?: unknown;
    response?: { message?: unknown };
  };
  if (typeof candidate.response?.message === 'string') {
    return candidate.response.message;
  }
  return typeof candidate.message === 'string' ? candidate.message : fallback;
}

interface DiscountSums {
  totalCents: number;
  count: number;
}

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
    @InjectModel(PromotionRedemption.name)
    private readonly redemptionModel: Model<PromotionRedemptionDocument>,
    @InjectModel(PromotionCustomerUsage.name)
    private readonly customerUsageModel: Model<PromotionCustomerUsageDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async listPublic(restaurantId?: string): Promise<PromotionResponse[]> {
    const now = new Date();
    const conditions: FilterQuery<PromotionDocument>[] = [
      {
        $or: [
          { startsAt: { $exists: false } },
          { startsAt: null },
          { startsAt: { $lte: now } },
        ],
      },
    ];

    if (restaurantId && Types.ObjectId.isValid(restaurantId)) {
      conditions.push({
        $or: [
          { restaurantId: null },
          { restaurantId: { $exists: false } },
          { restaurantId: new Types.ObjectId(restaurantId) },
        ],
      });
    }

    const promotions = await this.promotionModel
      .find({ active: true, expiresAt: { $gt: now }, $and: conditions })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    const names = await this.restaurantNames(
      promotions
        .map((promotion) => promotion.restaurantId)
        .filter((id): id is Types.ObjectId => Boolean(id)),
    );

    return promotions.map((promotion) =>
      toPromotionResponse(promotion, {
        restaurantName: promotion.restaurantId
          ? names.get(promotion.restaurantId.toString())
          : undefined,
      }),
    );
  }

  async listAdmin(query: PromotionQueryDto = {}): Promise<PromotionResponse[]> {
    const now = new Date();
    const conditions: FilterQuery<PromotionDocument>[] = [];

    if (query.scope === PromotionScope.GLOBAL) {
      conditions.push({
        $or: [{ restaurantId: null }, { restaurantId: { $exists: false } }],
      });
    } else if (query.scope === PromotionScope.RESTAURANT) {
      conditions.push({ restaurantId: { $ne: null } });
    }

    if (query.status === PromotionStatus.ACTIVE) {
      conditions.push(
        { active: true },
        { expiresAt: { $gt: now } },
        {
          $or: [
            { startsAt: { $exists: false } },
            { startsAt: null },
            { startsAt: { $lte: now } },
          ],
        },
      );
    } else if (query.status === PromotionStatus.INACTIVE) {
      conditions.push({ active: false }, { expiresAt: { $gt: now } });
    } else if (query.status === PromotionStatus.EXPIRED) {
      conditions.push({ expiresAt: { $lte: now } });
    } else if (query.status === PromotionStatus.SCHEDULED) {
      conditions.push(
        { active: true },
        { expiresAt: { $gt: now } },
        { startsAt: { $gt: now } },
      );
    }

    if (query.restaurantId) {
      conditions.push({ restaurantId: new Types.ObjectId(query.restaurantId) });
    }

    if (query.q?.trim()) {
      const pattern = new RegExp(escapeRegExp(query.q.trim()), 'i');
      conditions.push({ $or: [{ code: pattern }, { title: pattern }] });
    }

    const promotions = await this.promotionModel
      .find(conditions.length ? { $and: conditions } : {})
      .sort({ createdAt: -1 })
      .limit(500)
      .exec();

    return this.decorateManaged(promotions);
  }

  async listMine(actor: AuthenticatedUser): Promise<PromotionResponse[]> {
    const restaurant = await this.resolveOwnerRestaurant(actor.id, actor.restaurantId);
    const promotions = await this.promotionModel
      .find({ restaurantId: restaurant._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();

    return this.decorateManaged(promotions);
  }

  getPolicy(): typeof PROMOTION_POLICY {
    return PROMOTION_POLICY;
  }

  async create(
    adminId: string,
    dto: CreatePromotionDto,
  ): Promise<PromotionResponse> {
    const { scope, restaurantId } = this.resolveScope(dto);
    if (restaurantId) {
      await this.assertRestaurantExists(restaurantId.toString());
    }
    return this.persistCreate(adminId, dto, scope, restaurantId);
  }

  async createForOwner(
    actor: AuthenticatedUser,
    dto: CreatePromotionDto,
  ): Promise<PromotionResponse> {
    const restaurant = await this.resolveOwnerRestaurant(actor.id, actor.restaurantId);

    if (dto.scope === PromotionScope.GLOBAL) {
      throw new ForbiddenException({
        code: 'promotion_global_forbidden',
        message: 'Restaurant owners can only create coupons for their own restaurant.',
      });
    }
    if (
      dto.restaurantId &&
      dto.restaurantId !== restaurant._id.toString()
    ) {
      throw new ForbiddenException({
        code: 'promotion_restaurant_forbidden',
        message: 'You can only create coupons for your own restaurant.',
      });
    }

    this.assertOwnerPolicy(dto);
    return this.persistCreate(
      actor.id,
      dto,
      PromotionScope.RESTAURANT,
      restaurant._id,
    );
  }

  async update(
    id: string,
    dto: UpdatePromotionDto,
    actor: AuthenticatedUser,
  ): Promise<PromotionResponse> {
    const promotion = await this.getDocument(id);

    if (actor.role === UserRole.RESTAURANT_OWNER) {
      await this.assertOwnership(promotion, actor);
      if (dto.restaurantId !== undefined || dto.scope !== undefined) {
        throw new ForbiddenException({
          code: 'promotion_scope_forbidden',
          message: 'Restaurant owners cannot change coupon ownership.',
        });
      }
      this.assertOwnerPolicy(dto, promotion);
    }

    if (dto.code !== undefined) {
      const code = normaliseCode(dto.code);
      if (code !== promotion.code) {
        if (promotion.usageCount > 0) {
          throw new ConflictException({
            code: 'promotion_code_locked',
            message: 'The code cannot be changed after the coupon has been redeemed.',
          });
        }
        const existing = await this.promotionModel.exists({
          code,
          _id: { $ne: promotion._id },
        });
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
    if (dto.maxDiscount !== undefined) {
      promotion.maxDiscountCents = toCents(dto.maxDiscount);
    }
    if (dto.firstOrderOnly !== undefined) {
      promotion.firstOrderOnly = dto.firstOrderOnly;
    }
    if (dto.active !== undefined) promotion.active = dto.active;

    const currentScope = promotion.restaurantId
      ? PromotionScope.RESTAURANT
      : PromotionScope.GLOBAL;
    const currentRestaurantId = promotion.restaurantId?.toString() ?? null;
    const nextScope = dto.scope ?? currentScope;
    const nextRestaurantIdInput =
      dto.restaurantId !== undefined ? dto.restaurantId : currentRestaurantId;
    const changingOwnership =
      nextScope !== currentScope ||
      (nextRestaurantIdInput ?? null) !== currentRestaurantId;
    if (changingOwnership) {
      if (promotion.usageCount > 0) {
        throw new ConflictException({
          code: 'promotion_scope_locked',
          message: 'Ownership cannot be changed after the coupon has been redeemed.',
        });
      }
      if (dto.scope === PromotionScope.GLOBAL && dto.restaurantId) {
        throw new BadRequestException({
          code: 'promotion_scope_conflict',
          message: 'A global coupon cannot be linked to a restaurant.',
        });
      }

      let resolvedScope: PromotionScope;
      let resolvedRestaurantId: Types.ObjectId | null;

      if (nextScope === PromotionScope.GLOBAL) {
        if (dto.restaurantId) {
          throw new BadRequestException({
            code: 'promotion_scope_conflict',
            message: 'A global coupon cannot be linked to a restaurant.',
          });
        }
        resolvedScope = PromotionScope.GLOBAL;
        resolvedRestaurantId = null;
      } else {
        const restaurantId = nextRestaurantIdInput;
        if (!restaurantId || !Types.ObjectId.isValid(restaurantId)) {
          throw new BadRequestException({
            code: 'promotion_restaurant_required',
            message: 'Choose the restaurant this coupon belongs to.',
          });
        }
        resolvedScope = PromotionScope.RESTAURANT;
        resolvedRestaurantId = new Types.ObjectId(restaurantId);
        await this.assertRestaurantExists(restaurantId);
      }

      promotion.scope = resolvedScope;
      promotion.restaurantId = resolvedRestaurantId;
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

    if (dto.startsAt !== undefined) {
      const startsAt = new Date(dto.startsAt);
      if (Number.isNaN(startsAt.getTime())) {
        throw new BadRequestException({
          code: 'promotion_start_invalid',
          message: 'The start date is not valid.',
        });
      }
      promotion.startsAt = startsAt;
    }

    this.assertDateRange(promotion.startsAt, promotion.expiresAt);

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

    if (promotion.active && promotion.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException({
        code: 'promotion_expired',
        message: 'Update the expiry date before activating this coupon.',
      });
    }

    const nextType = (dto.discountType ?? promotion.discountType) as PromotionDiscountType;
    if (dto.discountType !== undefined || dto.value !== undefined) {
      if (nextType === PromotionDiscountType.FREE_DELIVERY) {
        promotion.discountType = nextType;
        promotion.percentOff = undefined;
        promotion.amountOffCents = undefined;
      } else {
        let value = dto.value;
        if (value === undefined && promotion.discountType === nextType) {
          value =
            nextType === PromotionDiscountType.PERCENTAGE
              ? promotion.percentOff
              : fromCents(promotion.amountOffCents ?? 0);
        }
        if (value === undefined) {
          throw new BadRequestException({
            code: 'promotion_discount_invalid',
            message: 'A promotion value is required.',
          });
        }
        const money = this.normaliseDiscount(nextType, value);
        promotion.discountType = nextType;
        promotion.percentOff = money.percentOff;
        promotion.amountOffCents = money.amountOffCents;
      }
    }

    await promotion.save();
    return toPromotionResponse(promotion, { managed: true });
  }

  async setStatus(
    id: string,
    active: boolean,
    actor: AuthenticatedUser,
  ): Promise<PromotionResponse> {
    const promotion = await this.getDocument(id);
    if (actor.role === UserRole.RESTAURANT_OWNER) {
      await this.assertOwnership(promotion, actor);
    }

    if (active && promotion.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException({
        code: 'promotion_expired',
        message: 'Update the expiry date before activating this coupon.',
      });
    }

    promotion.active = active;
    await promotion.save();
    return toPromotionResponse(promotion, { managed: true });
  }

  /** Delete only when the coupon has never been redeemed. */
  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const promotion = await this.getDocument(id);
    if (actor.role === UserRole.RESTAURANT_OWNER) {
      await this.assertOwnership(promotion, actor);
    }

    const redemption =
      promotion.usageCount > 0
        ? true
        : Boolean(await this.redemptionModel.exists({ promotionId: promotion._id }));

    if (redemption) {
      throw new ConflictException({
        code: 'promotion_in_use',
        message: 'This coupon already has redemptions. Deactivate it instead of deleting it.',
      });
    }

    await promotion.deleteOne();
  }

  async getUsage(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<PromotionUsageResponse> {
    const promotion = await this.getDocument(id);
    if (actor.role === UserRole.RESTAURANT_OWNER) {
      await this.assertOwnership(promotion, actor);
    }

    const [summary] = await this.redemptionModel.aggregate<{
      totalCents: number;
      count: number;
      lastRedeemedAt?: Date;
    }>([
      { $match: { promotionId: promotion._id } },
      {
        $group: {
          _id: null,
          totalCents: { $sum: '$discountCents' },
          count: { $sum: 1 },
          lastRedeemedAt: { $max: '$createdAt' },
        },
      },
    ]);

    const recent = await this.redemptionModel
      .find({ promotionId: promotion._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    const totalCents = summary?.totalCents ?? 0;
    const count = summary?.count ?? 0;

    return {
      promotion: toPromotionResponse(promotion, {
        managed: true,
        discountGrantedCents: totalCents,
        redemptionCount: count,
      }),
      totalRedemptions: count,
      totalDiscount: fromCents(totalCents),
      ...(summary?.lastRedeemedAt
        ? { lastRedeemedAt: summary.lastRedeemedAt.toISOString() }
        : {}),
      recent: recent.map((redemption) => ({
        id: redemption._id.toString(),
        orderId: redemption.orderId.toString(),
        code: redemption.code,
        discount: fromCents(redemption.discountCents),
        redeemedAt: redemption.createdAt.toISOString(),
      })),
    };
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

    if (!promotion) {
      throw new BadRequestException({
        code: 'promotion_invalid',
        message: 'That promotion code is not valid.',
      });
    }

    const status = promotionStatus(promotion);
    if (status === PromotionStatus.INACTIVE) {
      throw new BadRequestException({
        code: 'promotion_inactive',
        message: 'That promotion code is not active.',
      });
    }
    if (status === PromotionStatus.EXPIRED) {
      throw new ConflictException({
        code: 'promotion_expired',
        message: 'That promotion has expired.',
      });
    }
    if (status === PromotionStatus.SCHEDULED) {
      throw new ConflictException({
        code: 'promotion_not_started',
        message: 'That promotion has not started yet.',
      });
    }

    if (promotion.restaurantId) {
      if (
        !input.restaurantId ||
        promotion.restaurantId.toString() !== input.restaurantId
      ) {
        throw new ConflictException({
          code: 'promotion_not_applicable',
          message: 'That promotion is not available for this restaurant.',
        });
      }
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

    const customerId = new Types.ObjectId(input.customerId);
    const customerUsage = await this.customerUsageModel
      .findOne({ promotionId: promotion._id, customerId })
      .exec();
    const usedByCustomer =
      customerUsage?.count ??
      (await this.redemptionModel.countDocuments({
        promotionId: promotion._id,
        customerId,
      }));
    if (usedByCustomer >= promotion.perCustomerLimit) {
      throw new ConflictException({
        code: 'promotion_customer_limit',
        message: 'You have already used this promotion the maximum number of times.',
      });
    }

    if (promotion.firstOrderOnly) {
      const priorOrders = await this.orderModel.countDocuments({
        customerId,
        status: { $nin: [OrderStatus.CANCELLED, OrderStatus.REJECTED] },
      });
      if (priorOrders > 0) {
        throw new ConflictException({
          code: 'promotion_first_order_only',
          message: 'This promotion is available for first orders only.',
        });
      }
    }

    const result = computePromotionDiscount({
      discountType: promotion.discountType,
      percentOff: promotion.percentOff,
      amountOffCents: promotion.amountOffCents,
      maxDiscountCents: promotion.maxDiscountCents,
      subtotalCents: input.subtotalCents,
      deliveryFeeCents: input.deliveryFeeCents ?? 0,
    });

    if (result.freeDelivery && (input.deliveryFeeCents ?? 0) <= 0) {
      throw new ConflictException({
        code: 'promotion_not_applicable',
        message: 'Free delivery cannot be applied because this order has no delivery fee.',
      });
    }

    return {
      promotion,
      code,
      discountCents: result.discountCents,
      freeDelivery: result.freeDelivery,
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
        discountType: evaluation.promotion.discountType,
        freeDelivery: evaluation.freeDelivery,
      };
    } catch (error) {
      return {
        valid: false,
        code: normaliseCode(input.code),
        discount: 0,
        message: errorMessage(error, 'That promotion code is not valid.'),
      };
    }
  }

  /**
   * Atomically count a redemption.
   *
   * - Total usage is guarded by a conditional increment.
   * - Per-customer usage is guarded by a unique counter document plus a
   *   conditional increment, so concurrent requests cannot exceed either limit.
   * - `promotion_redemptions.orderId` is unique, making the operation
   *   idempotent for a retried order.
   */
  async redeem(
    evaluation: PromotionEvaluation,
    orderId: string,
    customerId: string,
    discountCents: number,
  ): Promise<void> {
    const { promotion } = evaluation;
    const orderObjectId = new Types.ObjectId(orderId);
    const customerObjectId = new Types.ObjectId(customerId);
    const now = new Date();

    const alreadyRedeemed = await this.redemptionModel
      .findOne({ orderId: orderObjectId })
      .exec();
    if (alreadyRedeemed) return;

    const updated = await this.promotionModel
      .findOneAndUpdate(
        {
          _id: promotion._id,
          active: true,
          expiresAt: { $gt: now },
          $and: [
            {
              $or: [
                { startsAt: { $exists: false } },
                { startsAt: null },
                { startsAt: { $lte: now } },
              ],
            },
            {
              $or: [
                { usageLimit: 0 },
                { $expr: { $lt: ['$usageCount', '$usageLimit'] } },
              ],
            },
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

    let customerConsumed = false;
    try {
      await this.consumeCustomerUsage(promotion, customerObjectId);
      customerConsumed = true;

      await this.redemptionModel.create({
        promotionId: promotion._id,
        customerId: customerObjectId,
        orderId: orderObjectId,
        code: evaluation.code,
        discountCents,
      });
    } catch (error) {
      if (customerConsumed) {
        await this.decrementCustomerUsage(promotion._id, customerObjectId);
      }
      await this.decrementPromotionUsage(promotion._id);

      if (isDuplicateKey(error)) {
        const duplicate = await this.redemptionModel
          .findOne({ orderId: orderObjectId })
          .exec();
        if (duplicate) return;
      }
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
      await this.decrementPromotionUsage(redemption.promotionId);
      await this.decrementCustomerUsage(
        redemption.promotionId,
        redemption.customerId,
      );
    }
  }

  private async consumeCustomerUsage(
    promotion: PromotionDocument,
    customerId: Types.ObjectId,
  ): Promise<void> {
    const filter = { promotionId: promotion._id, customerId };
    const existingRedemptions = await this.redemptionModel.countDocuments(filter);

    try {
      // `$max` repairs drift for coupons redeemed before the counter existed,
      // while `$setOnInsert` seeds the first document.
      await this.customerUsageModel
        .updateOne(
          filter,
          {
            $max: { count: existingRedemptions },
            $setOnInsert: { promotionId: promotion._id, customerId },
          },
          { upsert: true },
        )
        .exec();
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }

    const incremented = await this.customerUsageModel
      .findOneAndUpdate(
        { ...filter, count: { $lt: promotion.perCustomerLimit } },
        { $inc: { count: 1 } },
        { new: true },
      )
      .exec();

    if (!incremented) {
      throw new ConflictException({
        code: 'promotion_customer_limit',
        message: 'You have already used this promotion the maximum number of times.',
      });
    }
  }

  private async decrementPromotionUsage(
    promotionId: Types.ObjectId,
  ): Promise<void> {
    await this.promotionModel
      .updateOne(
        { _id: promotionId, usageCount: { $gt: 0 } },
        { $inc: { usageCount: -1 } },
      )
      .exec();
  }

  private async decrementCustomerUsage(
    promotionId: Types.ObjectId,
    customerId: Types.ObjectId,
  ): Promise<void> {
    await this.customerUsageModel
      .updateOne(
        { promotionId, customerId, count: { $gt: 0 } },
        { $inc: { count: -1 } },
      )
      .exec();
  }

  private async persistCreate(
    actorId: string,
    dto: CreatePromotionDto,
    scope: PromotionScope,
    restaurantId: Types.ObjectId | null,
  ): Promise<PromotionResponse> {
    const expiresAt = new Date(dto.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: 'promotion_expiry_invalid',
        message: 'A promotion must expire in the future.',
        details: { expiresAt: ['Choose a future date and time.'] },
      });
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    if (startsAt && Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException({
        code: 'promotion_start_invalid',
        message: 'The start date is not valid.',
      });
    }
    this.assertDateRange(startsAt, expiresAt);

    const money = this.normaliseDiscount(dto.discountType, dto.value);

    try {
      const promotion = await this.promotionModel.create({
        code: normaliseCode(dto.code),
        title: dto.title.trim(),
        subtitle: dto.subtitle?.trim() ?? '',
        description: dto.description?.trim() ?? '',
        imageKey: dto.imageKey ?? 'offer-default',
        accent: dto.accent ?? 'terracotta',
        discountType: dto.discountType,
        percentOff: money.percentOff,
        amountOffCents: money.amountOffCents,
        maxDiscountCents: dto.maxDiscount ? toCents(dto.maxDiscount) : 0,
        minOrderCents: dto.minOrder ? toCents(dto.minOrder) : 0,
        startsAt,
        expiresAt,
        restaurantId,
        scope,
        usageLimit: dto.usageLimit ?? 0,
        usageCount: 0,
        perCustomerLimit: dto.perCustomerLimit ?? 1,
        firstOrderOnly: dto.firstOrderOnly ?? false,
        active: dto.active ?? true,
        createdBy: new Types.ObjectId(actorId),
      });

      return toPromotionResponse(promotion, { managed: true });
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

  private resolveScope(dto: {
    scope?: PromotionScope;
    restaurantId?: string;
  }): { scope: PromotionScope; restaurantId: Types.ObjectId | null } {
    const scope =
      dto.scope ??
      (dto.restaurantId
        ? PromotionScope.RESTAURANT
        : PromotionScope.GLOBAL);

    if (scope === PromotionScope.GLOBAL) {
      if (dto.restaurantId) {
        throw new BadRequestException({
          code: 'promotion_scope_conflict',
          message: 'A global coupon cannot be linked to a restaurant.',
        });
      }
      return { scope, restaurantId: null };
    }

    if (!dto.restaurantId || !Types.ObjectId.isValid(dto.restaurantId)) {
      throw new BadRequestException({
        code: 'promotion_restaurant_required',
        message: 'Choose the restaurant this coupon belongs to.',
      });
    }

    return {
      scope,
      restaurantId: new Types.ObjectId(dto.restaurantId),
    };
  }

  private async resolveOwnerRestaurant(
    ownerId: string,
    restaurantId?: string,
  ): Promise<RestaurantDocument> {
    if (restaurantId) {
      const restaurant = Types.ObjectId.isValid(restaurantId)
        ? await this.restaurantModel.findById(restaurantId).exec()
        : null;

      if (!restaurant) {
        throw new NotFoundException({
          code: 'restaurant_not_found',
          message: 'That restaurant could not be found.',
        });
      }
      if (restaurant.ownerId.toString() !== ownerId) {
        throw new ForbiddenException({
          code: 'restaurant_not_owned',
          message: 'You can only manage restaurants that you own.',
        });
      }
      return restaurant;
    }

    const restaurant = await this.restaurantModel
      .findOne({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: 1 })
      .exec();

    if (!restaurant) {
      throw new NotFoundException({
        code: 'restaurant_not_found',
        message: 'This account is not linked to a restaurant yet.',
      });
    }
    return restaurant;
  }

  private async assertOwnership(
    promotion: PromotionDocument,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const restaurant = await this.resolveOwnerRestaurant(
      actor.id,
      actor.restaurantId,
    );
    if (
      !promotion.restaurantId ||
      promotion.restaurantId.toString() !== restaurant._id.toString()
    ) {
      throw new ForbiddenException({
        code: 'promotion_not_owned',
        message: 'You can only manage coupons for your own restaurant.',
      });
    }
  }

  private async assertRestaurantExists(restaurantId: string): Promise<void> {
    const exists = Types.ObjectId.isValid(restaurantId)
      ? await this.restaurantModel.exists({ _id: restaurantId })
      : null;
    if (!exists) {
      throw new BadRequestException({
        code: 'promotion_restaurant_invalid',
        message: 'That restaurant could not be found.',
      });
    }
  }

  private assertOwnerPolicy(
    dto: CreatePromotionDto | UpdatePromotionDto,
    existing?: PromotionDocument,
  ): void {
    const type = (dto.discountType ??
      existing?.discountType) as PromotionDiscountType | undefined;

    if (dto.value !== undefined) {
      if (
        type === PromotionDiscountType.PERCENTAGE &&
        dto.value > PROMOTION_POLICY.maxPercentage
      ) {
        this.policyError(
          `Percentage coupons are limited to ${PROMOTION_POLICY.maxPercentage}%.`,
        );
      }
      if (
        type === PromotionDiscountType.FIXED &&
        dto.value > PROMOTION_POLICY.maxFixedDiscount
      ) {
        this.policyError(
          `Fixed coupons are limited to $${PROMOTION_POLICY.maxFixedDiscount.toFixed(2)}.`,
        );
      }
    }

    if (
      dto.maxDiscount !== undefined &&
      dto.maxDiscount > PROMOTION_POLICY.maxDiscountCap
    ) {
      this.policyError(
        `Maximum discounts are limited to $${PROMOTION_POLICY.maxDiscountCap.toFixed(2)}.`,
      );
    }
    if (
      dto.minOrder !== undefined &&
      dto.minOrder > PROMOTION_POLICY.maxMinimumOrder
    ) {
      this.policyError(
        `Minimum order values are limited to $${PROMOTION_POLICY.maxMinimumOrder.toFixed(2)}.`,
      );
    }
    if (
      dto.usageLimit !== undefined &&
      dto.usageLimit > PROMOTION_POLICY.maxTotalUses
    ) {
      this.policyError(
        `Total uses are limited to ${PROMOTION_POLICY.maxTotalUses}.`,
      );
    }
    if (
      dto.perCustomerLimit !== undefined &&
      dto.perCustomerLimit > PROMOTION_POLICY.maxUsesPerCustomer
    ) {
      this.policyError(
        `Per-customer uses are limited to ${PROMOTION_POLICY.maxUsesPerCustomer}.`,
      );
    }
  }

  private policyError(message: string): never {
    throw new BadRequestException({
      code: 'promotion_policy_limit',
      message,
    });
  }

  private assertDateRange(startsAt: Date | undefined, expiresAt: Date): void {
    if (startsAt && startsAt.getTime() >= expiresAt.getTime()) {
      throw new BadRequestException({
        code: 'promotion_dates_invalid',
        message: 'The start date must be before the expiry date.',
        details: { startsAt: ['Start must be before expiry.'] },
      });
    }
  }

  private normaliseDiscount(
    discountType: PromotionDiscountType,
    value?: number,
  ): { percentOff?: number; amountOffCents?: number } {
    if (discountType === PromotionDiscountType.FREE_DELIVERY) {
      return {};
    }

    if (value === undefined || !Number.isFinite(value)) {
      throw new BadRequestException({
        code: 'promotion_discount_invalid',
        message: 'A promotion value is required.',
      });
    }

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

  private async decorateManaged(
    promotions: PromotionDocument[],
  ): Promise<PromotionResponse[]> {
    if (!promotions.length) return [];

    const sums = await this.discountSums(promotions.map((promotion) => promotion._id));
    const names = await this.restaurantNames(
      promotions
        .map((promotion) => promotion.restaurantId)
        .filter((id): id is Types.ObjectId => Boolean(id)),
    );

    return promotions.map((promotion) => {
      const sum = sums.get(promotion._id.toString());
      return toPromotionResponse(promotion, {
        managed: true,
        discountGrantedCents: sum?.totalCents ?? 0,
        redemptionCount: sum?.count ?? promotion.usageCount,
        restaurantName: promotion.restaurantId
          ? names.get(promotion.restaurantId.toString())
          : undefined,
      });
    });
  }

  private async discountSums(
    promotionIds: Types.ObjectId[],
  ): Promise<Map<string, DiscountSums>> {
    if (!promotionIds.length) return new Map();

    const rows = await this.redemptionModel.aggregate<{
      _id: Types.ObjectId;
      totalCents: number;
      count: number;
    }>([
      { $match: { promotionId: { $in: promotionIds } } },
      {
        $group: {
          _id: '$promotionId',
          totalCents: { $sum: '$discountCents' },
          count: { $sum: 1 },
        },
      },
    ]);

    return new Map(
      rows.map((row) => [
        row._id.toString(),
        { totalCents: row.totalCents, count: row.count },
      ]),
    );
  }

  private async restaurantNames(
    restaurantIds: Types.ObjectId[],
  ): Promise<Map<string, string>> {
    if (!restaurantIds.length) return new Map();

    const restaurants = await this.restaurantModel
      .find({ _id: { $in: restaurantIds } })
      .select('name')
      .exec();

    return new Map(
      restaurants.map((restaurant) => [
        restaurant._id.toString(),
        restaurant.name,
      ]),
    );
  }
}
