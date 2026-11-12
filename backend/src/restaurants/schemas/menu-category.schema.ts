import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** A menu section belonging to exactly one restaurant. */
@Schema({ timestamps: true, collection: 'menu_categories' })
export class MenuCategory {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 60 })
  name: string;

  @Prop({ trim: true, maxlength: 240 })
  description?: string;

  @Prop({ default: 0 })
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

export type MenuCategoryDocument = HydratedDocument<MenuCategory>;
export const MenuCategorySchema = SchemaFactory.createForClass(MenuCategory);

MenuCategorySchema.index({ restaurantId: 1, sortOrder: 1 });
MenuCategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });
