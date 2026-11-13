import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  AssignmentSource,
  AutoAssignmentStatus,
  AutoAssignmentTrigger,
  DeliveryAssignmentAction,
  DeliveryStatus,
} from '../../common/enums/delivery.enum';

/** Latest point published by the assigned driver. */
@Schema({ _id: false })
export class DeliveryLocation {
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
export const DeliveryLocationSchema = SchemaFactory.createForClass(DeliveryLocation);

/** Append-only platform assignment audit row. */
@Schema({ _id: true })
export class DeliveryAssignmentEvent {
  @Prop({ required: true, enum: DeliveryAssignmentAction })
  action: string;

  @Prop({ required: true, enum: AssignmentSource })
  source: string;

  @Prop({ type: Types.ObjectId, ref: 'DriverProfile', default: null })
  previousDriverId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'DriverProfile', default: null })
  newDriverId: Types.ObjectId | null;

  /** Convenience alias for the driver the event concerns. */
  @Prop({ type: Types.ObjectId, ref: 'DriverProfile', default: null })
  driverId: Types.ObjectId | null;

  @Prop({ type: String, trim: true, maxlength: 120, default: null })
  driverName: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  adminId: Types.ObjectId | null;

  @Prop({ trim: true, maxlength: 240 })
  reason?: string;

  @Prop({ required: true })
  at: Date;
}
export const DeliveryAssignmentEventSchema =
  SchemaFactory.createForClass(DeliveryAssignmentEvent);

@Schema({ _id: false })
export class DeliveryAutoAssignmentState {
  @Prop({ required: true, min: 0, default: 0 })
  attempts: number;

  @Prop()
  lastAttemptAt?: Date;

  @Prop({ enum: AutoAssignmentTrigger })
  lastTrigger?: string;

  @Prop({ required: true, enum: AutoAssignmentStatus })
  status: string;

  @Prop({ trim: true, maxlength: 240 })
  reason?: string;
}
export const DeliveryAutoAssignmentStateSchema = SchemaFactory.createForClass(
  DeliveryAutoAssignmentState,
);

@Schema({ timestamps: true, collection: 'deliveries' })
export class Delivery {
  @Prop({
    type: Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true,
    index: true,
  })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DriverProfile', default: null, index: true })
  driverId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({
    required: true,
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING_ASSIGNMENT,
    index: true,
  })
  status: string;

  @Prop()
  estimatedArrivalAt?: Date;

  @Prop()
  assignedAt?: Date;

  @Prop()
  pickedUpAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop({ type: DeliveryLocationSchema, default: null })
  driverLocation: DeliveryLocation | null;

  @Prop({ type: [DeliveryAssignmentEventSchema], default: [] })
  assignmentHistory: DeliveryAssignmentEvent[];

  @Prop({ type: DeliveryAutoAssignmentStateSchema })
  autoAssignment?: DeliveryAutoAssignmentState;

  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryDocument = HydratedDocument<Delivery>;
export const DeliverySchema = SchemaFactory.createForClass(Delivery);

DeliverySchema.index({ driverId: 1, status: 1 });
DeliverySchema.index({ status: 1, createdAt: 1 });
