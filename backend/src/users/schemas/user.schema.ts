import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  AccountStatus,
  AddressLabel,
  DietaryPreference,
  PaymentBrand,
  PaymentType,
  UserRole,
} from '../../common/enums/user.enum';

@Schema({ _id: false })
export class Coordinates {
  @Prop({ required: true, min: -90, max: 90 })
  lat: number;

  @Prop({ required: true, min: -180, max: 180 })
  lng: number;
}
export const CoordinatesSchema = SchemaFactory.createForClass(Coordinates);

@Schema({ _id: true })
export class Address {
  @Prop({ required: true, enum: AddressLabel, default: AddressLabel.HOME })
  label: string;

  @Prop({ required: true, trim: true, maxlength: 160 })
  line1: string;

  @Prop({ trim: true, maxlength: 160 })
  line2?: string;

  @Prop({ required: true, trim: true, maxlength: 80 })
  city: string;

  @Prop({ required: true, trim: true, maxlength: 80 })
  state: string;

  @Prop({ required: true, trim: true, maxlength: 20 })
  postalCode: string;

  @Prop({ required: true, trim: true, maxlength: 80 })
  country: string;

  @Prop({ trim: true, maxlength: 240 })
  instructions?: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ type: CoordinatesSchema })
  coordinates?: Coordinates;
}
export const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({ _id: false })
export class UserPreferences {
  @Prop({ type: [String], enum: Object.values(DietaryPreference), default: [] })
  dietary: string[];

  @Prop({ default: true })
  emailReceipts: boolean;

  @Prop({ default: true })
  orderUpdates: boolean;

  @Prop({ default: false })
  marketing: boolean;
}
export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);

@Schema({ _id: true })
export class PaymentMethod {
  @Prop({ required: true, enum: PaymentType })
  type: string;

  @Prop({ required: true, trim: true, maxlength: 80 })
  label: string;

  @Prop({ enum: PaymentBrand })
  brand?: string;

  @Prop({ trim: true, maxlength: 4 })
  last4?: string;

  @Prop({ trim: true, maxlength: 7 })
  expiry?: string;

  @Prop({ default: false })
  isDefault: boolean;
}
export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  fullName: string;

  @Prop({ trim: true, maxlength: 40, default: '' })
  phone: string;

  @Prop({ trim: true, maxlength: 500 })
  avatarKey?: string;

  /** Cloudinary public id of the profile image. */
  @Prop({ trim: true, maxlength: 300 })
  avatarPublicId?: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.CUSTOMER, index: true })
  role: string;

  @Prop({
    required: true,
    enum: AccountStatus,
    default: AccountStatus.APPROVED,
    index: true,
  })
  accountStatus: string;

  @Prop({ type: Types.ObjectId, ref: 'Restaurant' })
  restaurantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DriverProfile' })
  driverId?: Types.ObjectId;

  @Prop({ type: UserPreferencesSchema, default: () => ({}) })
  preferences: UserPreferences;

  @Prop({ type: [AddressSchema], default: [] })
  addresses: Address[];

  @Prop({ type: [PaymentMethodSchema], default: [] })
  paymentMethods: PaymentMethod[];

  @Prop({ select: false })
  passwordResetTokenHash?: string;

  @Prop({ type: Date, select: false })
  passwordResetExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1, accountStatus: 1 });
