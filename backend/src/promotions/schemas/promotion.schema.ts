import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  PromotionAccent,
  PromotionDiscountType,
} from '../../common/enums/promotion.enum';

/**
 * Platform promotion. Restaurant-specific promotions are supported through the
 * optional `restaurantId`; a null value means platform-wide.
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

  /** Percentage 1–100 for PERCENTAGE promotions; null for fixed discounts. */
  @Prop({ min: 1, max: 100 })
  percentOff?: number;

  /** Integer cents for FIXED promotions; null for percentage discounts. */
  @Prop({ min: 0 })
  amountOffCents?: number;

  @Prop({ required: true, min: 0, default: 0 })
  minOrderCents: number;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Restaurant', default: null, index: true })
  restaurantId: Types.ObjectId | null;

  /** 0 means unlimited. */
  @Prop({ required: true, min: 0, default: 0 })
  usageLimit: number;

  @Prop({ required: true, min: 0, default: 0 })
  usageCount: number;

  @Prop({ required: true, min: 1, default: 1 })
  perCustomerLimit: number;

  @Prop({ required: true, default: true, index: true })
  active: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type PromotionDocument = HydratedDocument<Promotion>;
export const PromotionSchema = SchemaFactory.createForClass(Promotion);
PromotionSchema.index({ active: 1, expiresAt: 1 });

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
