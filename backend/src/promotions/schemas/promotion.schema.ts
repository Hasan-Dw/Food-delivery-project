import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  PromotionAccent,
  PromotionDiscountType,
  PromotionScope,
} from '../../common/enums/promotion.enum';

/**
 * Platform promotion. `restaurantId` is null for a global coupon and set for a
 * restaurant-owned coupon. `scope` is derived on every save so historical
 * documents remain readable even if they predate the field.
 */
@Schema({ timestamps: true, collection: 'promotions' })
export class Promotion {
  @Prop({ required: true, uppercase: true, trim: true, unique: true, index: true })
  code: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ trim: true, maxlength: 180, default: '' })
  subtitle: string;

  @Prop({ trim: true, maxlength: 1000, default: '' })
  description: string;

  @Prop({ trim: true, maxlength: 120, default: 'offer-default' })
  imageKey: string;

  @Prop({ required: true, enum: PromotionAccent, default: PromotionAccent.TERRACOTTA })
  accent: string;

  @Prop({ required: true, enum: PromotionDiscountType })
  discountType: string;

  /** Percentage 1–100 for PERCENTAGE promotions. */
  @Prop({ min: 1, max: 100 })
  percentOff?: number;

  /** Integer cents for FIXED promotions. */
  @Prop({ min: 0 })
  amountOffCents?: number;

  /** Optional cap for percentage and free-delivery discounts. 0 means none. */
  @Prop({ min: 0, default: 0 })
  maxDiscountCents: number;

  @Prop({ required: true, min: 0, default: 0 })
  minOrderCents: number;

  /** Optional campaign start. Missing means the coupon is live immediately. */
  @Prop({ type: Date })
  startsAt?: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Restaurant', default: null, index: true })
  restaurantId: Types.ObjectId | null;

  @Prop({ required: true, enum: PromotionScope, default: PromotionScope.GLOBAL })
  scope: string;

  /** 0 means unlimited. */
  @Prop({ required: true, min: 0, default: 0 })
  usageLimit: number;

  @Prop({ required: true, min: 0, default: 0 })
  usageCount: number;

  @Prop({ required: true, min: 1, default: 1 })
  perCustomerLimit: number;

  /** Only customers without a prior non-cancelled order may redeem. */
  @Prop({ required: true, default: false })
  firstOrderOnly: boolean;

  @Prop({ required: true, default: true, index: true })
  active: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type PromotionDocument = HydratedDocument<Promotion>;
export const PromotionSchema = SchemaFactory.createForClass(Promotion);

// Keep the stored scope consistent with the restaurant link, including for
// documents created before the scope field existed.
PromotionSchema.pre('save', function (next) {
  this.scope = this.restaurantId
    ? PromotionScope.RESTAURANT
    : PromotionScope.GLOBAL;
  next();
});

PromotionSchema.index({ active: 1, expiresAt: 1 });
PromotionSchema.index({ restaurantId: 1, active: 1 });

/** Immutable record of a promotion redeemed against an order. */
@Schema({ timestamps: true, collection: 'promotion_redemptions' })
export class PromotionRedemption {
  @Prop({ type: Types.ObjectId, ref: 'Promotion', required: true, index: true })
  promotionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, unique: true })
  orderId: Types.ObjectId;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, min: 0 })
  discountCents: number;

  createdAt: Date;
  updatedAt: Date;
}

export type PromotionRedemptionDocument = HydratedDocument<PromotionRedemption>;
export const PromotionRedemptionSchema =
  SchemaFactory.createForClass(PromotionRedemption);

PromotionRedemptionSchema.index({ promotionId: 1, customerId: 1 });

/**
 * Per-customer counter used to enforce `perCustomerLimit` without a race.
 * A unique compound key means concurrent redemptions cannot slip past the
 * limit by reading a stale redemption count.
 */
@Schema({ timestamps: true, collection: 'promotion_customer_usage' })
export class PromotionCustomerUsage {
  @Prop({ type: Types.ObjectId, ref: 'Promotion', required: true, index: true })
  promotionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: true, min: 0, default: 0 })
  count: number;

  createdAt: Date;
  updatedAt: Date;
}

export type PromotionCustomerUsageDocument =
  HydratedDocument<PromotionCustomerUsage>;
export const PromotionCustomerUsageSchema = SchemaFactory.createForClass(
  PromotionCustomerUsage,
);

PromotionCustomerUsageSchema.index(
  { promotionId: 1, customerId: 1 },
  { unique: true },
);
