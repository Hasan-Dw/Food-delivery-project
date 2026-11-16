import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Types,
  Schema as MongooseSchema,
} from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

export enum ReviewType {
  RESTAURANT = 'restaurant',
  MENU_ITEM = 'menu_item',
  DELIVERY = 'delivery',
}

export enum ReviewStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
}
export enum ReviewModerationAction {
  HIDE = 'hide',
  RESTORE = 'restore',
}

export interface ReviewModerationHistory {
  actorId: Types.ObjectId;
  action: ReviewModerationAction;
  createdAt: Date;
}

@Schema({ timestamps: true, collection: 'reviews' })
export class Review {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  customerId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  })
  restaurantId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Order',
    required: true,
  })
  orderId: Types.ObjectId;

  /** Restaurant, individual dish or the delivery/service experience. */
  @Prop({
    type: String,
    enum: ReviewType,
    default: ReviewType.RESTAURANT,
    required: true,
  })
  type: ReviewType;

  /** Set for menu-item reviews only. */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'MenuItem',
    default: null,
  })
  menuItemId: Types.ObjectId | null;

  /** Assigned driver at delivery time, set for delivery reviews. */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'DriverProfile',
    default: null,
  })
  driverId: Types.ObjectId | null;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 5,
  })
  rating: number;

  /** Delivery experience score (delivery reviews only). */
  @Prop({ type: Number, min: 1, max: 5, default: null })
  deliveryRating: number | null;

  /** Service quality score (delivery reviews only). */
  @Prop({ type: Number, min: 1, max: 5, default: null })
  serviceRating: number | null;

  @Prop({ trim: true, maxlength: 1000, default: '' })
  comment: string;

  @Prop({
    type: String,
    enum: ReviewStatus,
    default: ReviewStatus.VISIBLE,
  })
  status: ReviewStatus;
  @Prop({
  type: [
    {
      actorId: {
        type: MongooseSchema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      action: {
        type: String,
        enum: ReviewModerationAction,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  default: [],
})
moderationHistory: ReviewModerationHistory[];

  createdAt: Date;
  updatedAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

/**
 * One submission per customer, order and review dimension. A single delivered
 * order can therefore have a restaurant review, one review per purchased dish
 * and one delivery/service review without overwriting each other.
 */
ReviewSchema.index(
  { orderId: 1, type: 1, menuItemId: 1 },
  { unique: true },
);

ReviewSchema.index({
  restaurantId: 1,
  type: 1,
  status: 1,
  createdAt: -1,
});

ReviewSchema.index({
  menuItemId: 1,
  type: 1,
  status: 1,
  createdAt: -1,
});

ReviewSchema.index({
  customerId: 1,
  createdAt: -1,
});
