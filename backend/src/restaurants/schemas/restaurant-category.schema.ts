import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** Platform-level cuisine catalog used by discovery. */
@Schema({ timestamps: true, collection: 'restaurant_categories' })
export class RestaurantCategory {
  @Prop({ required: true, trim: true, maxlength: 60 })
  name: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  imageKey: string;

  @Prop({ trim: true, maxlength: 240 })
  description?: string;

  @Prop({ default: 0 })
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

export type RestaurantCategoryDocument = HydratedDocument<RestaurantCategory>;
export const RestaurantCategorySchema = SchemaFactory.createForClass(RestaurantCategory);
