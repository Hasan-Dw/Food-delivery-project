import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: true })
export class MenuOption {
  @Prop({ required: true, trim: true, maxlength: 80 })
  name: string;

  @Prop({ required: true, min: 0 })
  priceDeltaCents: number;

  @Prop({ default: false })
  isDefault: boolean;
}
export const MenuOptionSchema = SchemaFactory.createForClass(MenuOption);

@Schema({ _id: true })
export class MenuOptionGroup {
  @Prop({ required: true, trim: true, maxlength: 80 })
  name: string;

  @Prop({ default: false })
  required: boolean;

  @Prop({ required: true, min: 0, default: 0 })
  minSelections: number;

  @Prop({ required: true, min: 1, default: 1 })
  maxSelections: number;

  @Prop({ type: [MenuOptionSchema], default: [] })
  options: MenuOption[];
}
export const MenuOptionGroupSchema = SchemaFactory.createForClass(MenuOptionGroup);

@Schema({ timestamps: true, collection: 'menu_items' })
export class MenuItem {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MenuCategory', required: true, index: true })
  categoryId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, trim: true, maxlength: 500, default: '' })
  description: string;

  @Prop({ required: true, min: 0 })
  priceCents: number;

  @Prop({ required: true, trim: true, maxlength: 120, default: 'product-default' })
  imageKey: string;

  @Prop({ min: 0, max: 5000 })
  calories?: number;

  @Prop({ min: 0, max: 5, default: 0 })
  rating: number;

  @Prop({ min: 0, default: 0 })
  reviewCount: number;

  @Prop({ default: false })
  isPopular: boolean;

  @Prop({ default: false })
  isVegetarian: boolean;

  @Prop({ default: false })
  isSpicy: boolean;

  @Prop({ default: true })
  available: boolean;

  @Prop({ type: [MenuOptionGroupSchema], default: [] })
  optionGroups: MenuOptionGroup[];

  createdAt: Date;
  updatedAt: Date;
}

export type MenuItemDocument = HydratedDocument<MenuItem>;
export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

MenuItemSchema.index({ restaurantId: 1, categoryId: 1, name: 1 });
MenuItemSchema.index({ isPopular: -1, available: -1 });
