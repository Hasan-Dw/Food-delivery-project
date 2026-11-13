import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  AccountStatus,
  DriverAvailability,
  VehicleType,
} from '../../common/enums/user.enum';

/** Latest GPS point published by a driver, with or without an active delivery. */
@Schema({ _id: false })
export class DriverLastLocation {
  @Prop({ required: true, min: -90, max: 90 })
  lat: number;

  @Prop({ required: true, min: -180, max: 180 })
  lng: number;

  @Prop({ min: 0, max: 360 })
  heading?: number;

  @Prop({ min: 0 })
  speedKph?: number;

  @Prop({ required: true })
  updatedAt: Date;
}
export const DriverLastLocationSchema = SchemaFactory.createForClass(DriverLastLocation);

/**
 * Platform-owned driver profile. Assignment, deliveries and GPS live in the
 * deliveries module; this record owns approval, availability and the at-most-one
 * active delivery pointer.
 */
@Schema({ timestamps: true, collection: 'driver_profiles' })
export class DriverProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: VehicleType })
  vehicle: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  serviceArea: string;

  @Prop({ trim: true, maxlength: 40, default: '' })
  phone: string;

  @Prop({
    required: true,
    enum: AccountStatus,
    default: AccountStatus.PENDING_APPROVAL,
    index: true,
  })
  accountStatus: string;

  @Prop({
    required: true,
    enum: DriverAvailability,
    default: DriverAvailability.OFFLINE,
    index: true,
  })
  availability: string;

  @Prop({ type: Types.ObjectId, ref: 'Delivery', default: null })
  activeDeliveryId: Types.ObjectId | null;

  @Prop({ required: true, min: 0, max: 5, default: 5 })
  rating: number;

  @Prop({ required: true, min: 0, default: 0 })
  completedDeliveries: number;

  @Prop({ required: true, min: 0, default: 0 })
  totalEarningsCents: number;

  @Prop({ type: DriverLastLocationSchema })
  lastLocation?: DriverLastLocation;

  @Prop()
  approvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type DriverProfileDocument = HydratedDocument<DriverProfile>;
export const DriverProfileSchema = SchemaFactory.createForClass(DriverProfile);

DriverProfileSchema.index({ accountStatus: 1, availability: 1 });
