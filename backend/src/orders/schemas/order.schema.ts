import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AddressLabel, PaymentBrand, PaymentType } from '../../common/enums/user.enum';
import { OrderStatus, PaymentStatus } from '../../common/enums/order.enum';

@Schema({ _id: false })
export class OrderAddressCoordinates {
  @Prop({ required: true, min: -90, max: 90 })
  lat: number;

  @Prop({ required: true, min: -180, max: 180 })
  lng: number;
}
export const OrderAddressCoordinatesSchema = SchemaFactory.createForClass(
  OrderAddressCoordinates,
);

/** Snapshot of the delivery destination at purchase time. */
@Schema({ _id: true })
export class OrderAddress {
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

  @Prop({ type: OrderAddressCoordinatesSchema })
  coordinates?: OrderAddressCoordinates;
}
export const OrderAddressSchema = SchemaFactory.createForClass(OrderAddress);

/** Immutable snapshot of a purchased item option. */
@Schema({ _id: false })
export class OrderItemOption {
  @Prop({ type: Types.ObjectId, required: true })
  groupId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  groupName: string;

  @Prop({ type: Types.ObjectId, required: true })
  optionId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  optionName: string;

  @Prop({ required: true, min: 0 })
  priceDeltaCents: number;
}
export const OrderItemOptionSchema = SchemaFactory.createForClass(OrderItemOption);

/**
 * Purchased line item. Name, image and price are copied from the menu at
 * checkout so changing a menu later never rewrites history.
 */
@Schema({ _id: true })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, trim: true, maxlength: 120, default: 'product-default' })
  imageKey: string;

  @Prop({ required: true, min: 1, max: 20 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPriceCents: number;

  @Prop({ type: [OrderItemOptionSchema], default: [] })
  selectedOptions: OrderItemOption[];

  @Prop({ trim: true, maxlength: 240 })
  notes?: string;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class OrderTotals {
  @Prop({ required: true, min: 0 })
  subtotalCents: number;

  @Prop({ required: true, min: 0 })
  deliveryFeeCents: number;

  @Prop({ required: true, min: 0 })
  serviceFeeCents: number;

  @Prop({ required: true, min: 0 })
  discountCents: number;

  @Prop({ required: true, min: 0 })
  taxCents: number;

  @Prop({ required: true, min: 0 })
  totalCents: number;
}
export const OrderTotalsSchema = SchemaFactory.createForClass(OrderTotals);

/** Payment method snapshot. Card data is never collected or stored. */
@Schema({ _id: true })
export class OrderPaymentMethod {
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
export const OrderPaymentMethodSchema = SchemaFactory.createForClass(OrderPaymentMethod);

@Schema({ _id: false })
export class OrderStatusEvent {
  @Prop({ required: true, enum: OrderStatus })
  status: string;

  @Prop({ required: true })
  at: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  byUserId?: Types.ObjectId;

  @Prop({ trim: true, maxlength: 240 })
  reason?: string;
}
export const OrderStatusEventSchema = SchemaFactory.createForClass(OrderStatusEvent);

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  /** Idempotency key supplied by the client once per checkout session. */
  @Prop({ required: true, trim: true, maxlength: 120, unique: true, index: true })
  idempotencyKey: string;

  @Prop({ required: true, trim: true, unique: true, index: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  customerName: string;

  @Prop({ trim: true, maxlength: 40, default: '' })
  customerPhone: string;

  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  restaurantName: string;

  @Prop({ trim: true, maxlength: 120, default: 'restaurant-default' })
  restaurantImageKey: string;

  @Prop({ type: [OrderItemSchema], default: [] })
  items: OrderItem[];

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING, index: true })
  status: string;

  @Prop({ required: true, type: OrderAddressSchema })
  deliveryAddress: OrderAddress;

  @Prop({ type: Types.ObjectId, ref: 'Delivery' })
  deliveryId?: Types.ObjectId;

  @Prop({ required: true, type: OrderTotalsSchema })
  totals: OrderTotals;

  @Prop({ required: true, type: OrderPaymentMethodSchema })
  paymentMethod: OrderPaymentMethod;

  @Prop({
    required: true,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: string;

  @Prop({ type: Types.ObjectId, ref: 'Promotion' })
  promotionId?: Types.ObjectId;

  @Prop({ uppercase: true, trim: true, maxlength: 32 })
  couponCode?: string;

  @Prop({ trim: true, maxlength: 1000 })
  notes?: string;

  @Prop({ required: true, default: () => new Date() })
  placedAt: Date;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  preparingAt?: Date;

  @Prop()
  readyAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop({ type: [OrderStatusEventSchema], default: [] })
  statusHistory: OrderStatusEvent[];

  createdAt: Date;
  updatedAt: Date;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ customerId: 1, placedAt: -1 });
OrderSchema.index({ restaurantId: 1, placedAt: -1 });
OrderSchema.index({ restaurantId: 1, status: 1 });
