import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { RestaurantStatus } from '../../common/enums/user.enum';

@Schema({ _id: true })
export class RestaurantAddress {
  @Prop({ required: true, trim: true, maxlength: 180 })
  line1: string;

  @Prop({ trim: true, maxlength: 160 })
  line2?: string;

  @Prop({ trim: true, maxlength: 80, default: '' })
  city: string;

  @Prop({ trim: true, maxlength: 80, default: '' })
  state: string;

  @Prop({ trim: true, maxlength: 20, default: '' })
  postalCode: string;

  @Prop({ trim: true, maxlength: 80, default: '' })
  country: string;

  @Prop({ trim: true, maxlength: 240 })
  instructions?: string;

  @Prop({ trim: true, maxlength: 20, default: 'Other' })
  label: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({
    type: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
    },
  })
  coordinates?: { lat: number; lng: number };
}
export const RestaurantAddressSchema = SchemaFactory.createForClass(RestaurantAddress);

@Schema({ _id: false })
export class OpeningHours {
  @Prop({ required: true, trim: true, maxlength: 40 })
  day: string;

  @Prop({ required: true, trim: true, maxlength: 10 })
  open: string;

  @Prop({ required: true, trim: true, maxlength: 10 })
  close: string;
}
export const OpeningHoursSchema = SchemaFactory.createForClass(OpeningHours);

@Schema({ timestamps: true, collection: 'restaurants' })
export class Restaurant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  slug: string;

  @Prop({ trim: true, maxlength: 160, default: '' })
  tagline: string;

  @Prop({ type: [String], default: [] })
  cuisines: string[];

  @Prop({ type: [String], default: [] })
  categorySlugs: string[];

  @Prop({ trim: true, maxlength: 500, default: 'restaurant-default' })
  imageKey: string;

  /** Cloudinary public id of the cover, used for replacement/deletion. */
  @Prop({ trim: true, maxlength: 300 })
  imagePublicId?: string;

  @Prop({ trim: true, maxlength: 500 })
  logoKey?: string;

  @Prop({ trim: true, maxlength: 300 })
  logoPublicId?: string;

  @Prop({ min: 0, max: 5, default: 0 })
  rating: number;

  @Prop({ min: 0, default: 0 })
  reviewCount: number;

  @Prop({ min: 0, default: 0 })
  deliveryFee: number;

  @Prop({
    type: [Number],
    default: [25, 40],
    validate: {
      validator: (value: number[]) =>
        value.length === 2 &&
        value.every((entry) => Number.isInteger(entry) && entry >= 0),
      message: 'estimatedDeliveryMinutes must contain two whole minutes values',
    },
  })
  estimatedDeliveryMinutes: number[];

  @Prop({ min: 0, default: 0 })
  distanceKm: number;

  @Prop({ min: 0, default: 0 })
  minOrder: number;

  @Prop({ type: Number, min: 1, max: 4, default: 2 })
  priceLevel: number;

  @Prop({ default: true })
  isOpen: boolean;

  @Prop({ type: [String], default: [] })
  badges: string[];

  @Prop({ type: RestaurantAddressSchema, required: true })
  address: RestaurantAddress;

  @Prop({ type: [OpeningHoursSchema], default: [] })
  openingHours: OpeningHours[];

  @Prop({ default: false })
  featured: boolean;

  @Prop({ trim: true, maxlength: 120 })
  offerLabel?: string;

  @Prop({ trim: true, maxlength: 1000 })
  description?: string;

  @Prop({
    required: true,
    enum: RestaurantStatus,
    default: RestaurantStatus.PENDING_APPROVAL,
    index: true,
  })
  status: string;

  createdAt: Date;
  updatedAt: Date;
}

export type RestaurantDocument = HydratedDocument<Restaurant>;
export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index({ status: 1, featured: -1, rating: -1 });
RestaurantSchema.index({ categorySlugs: 1, status: 1 });
