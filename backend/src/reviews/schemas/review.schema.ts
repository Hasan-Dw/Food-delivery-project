import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Types,
  Schema as MongooseSchema,
} from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

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

  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 5,
  })
  rating: number;

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
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ orderId: 1 }, { unique: true });

ReviewSchema.index({
  restaurantId: 1,
  status: 1,
  createdAt: -1,
});

ReviewSchema.index({
  customerId: 1,
  createdAt: -1,
});