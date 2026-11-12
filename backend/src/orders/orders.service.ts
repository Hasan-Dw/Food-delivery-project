import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  OrderAction,
  ORDER_ACTION_TARGET,
  OrderStatus,
  PaymentStatus,
  canTransitionOrderStatus,
  isActiveOrderStatus,
} from '../common/enums/order.enum';
import {
  DeliveryStatus,
  canReleaseAssignment,
} from '../common/enums/delivery.enum';
import { PaymentType, UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { fromCents, orderCodeFromId, toCents } from '../common/utils/money.util';
import { PricingService } from '../checkout/pricing.service';
import { DeliveriesService } from '../deliveries/deliveries.service';
import {
  Delivery,
  type DeliveryDocument,
} from '../deliveries/schemas/delivery.schema';
import { PromotionsService } from '../promotions/promotions.service';
import { UsersService } from '../users/users.service';
import type { UserDocument } from '../users/schemas/user.schema';
import type { CreateOrderDto, OrderQueryDto } from './dto/order.dto';
import type { OrderResponse } from './interfaces/order-response.interface';
import { toOrderResponse, toTrackingEvents } from './order.mapper';
import { Order, type OrderDocument } from './schemas/order.schema';

interface StatusStamp {
  field: 'acceptedAt' | 'preparingAt' | 'readyAt' | 'completedAt' | 'rejectedAt' | 'cancelledAt';
}

const STATUS_STAMPS: Partial<Record<OrderStatus, StatusStamp>> = {
  [OrderStatus.ACCEPTED]: { field: 'acceptedAt' },
  [OrderStatus.PREPARING]: { field: 'preparingAt' },
  [OrderStatus.READY]: { field: 'readyAt' },
  [OrderStatus.COMPLETED]: { field: 'completedAt' },
  [OrderStatus.REJECTED]: { field: 'rejectedAt' },
  [OrderStatus.CANCELLED]: { field: 'cancelledAt' },
};

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Delivery.name)
    private readonly deliveryModel: Model<DeliveryDocument>,
    private readonly pricingService: PricingService,
    private readonly deliveriesService: DeliveriesService,
    private readonly promotionsService: PromotionsService,
    private readonly usersService: UsersService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateOrderDto): Promise<OrderResponse> {
    const existing = await this.orderModel
      .findOne({ idempotencyKey: dto.idempotencyKey })
      .exec();
    if (existing) {
      if (existing.customerId.toString() !== actor.id) {
        throw new ConflictException({
          code: 'idempotency_conflict',
          message: 'That checkout key is already in use.',
        });
      }
      return toOrderResponse(existing);
    }

    const user = await this.usersService.findById(actor.id);
    if (!user) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'The customer account could not be loaded.',
      });
    }

    const priced = await this.pricingService.priceCart({
      customerId: actor.id,
      restaurantId: dto.restaurantId,
      items: dto.items,
      couponCode: dto.couponCode,
      strictPromotion: true,
    });

    const paymentMethod = this.resolvePaymentMethod(user, dto.paymentMethodId);
    const orderId = new Types.ObjectId();
    const now = new Date();

    const address = dto.deliveryAddress;
    const order = new this.orderModel({
      _id: orderId,
      idempotencyKey: dto.idempotencyKey,
      code: orderCodeFromId(orderId.toString()),
      customerId: new Types.ObjectId(actor.id),
      customerName: dto.customerName?.trim() || user.fullName,
      customerPhone: dto.customerPhone?.trim() ?? user.phone ?? '',
      restaurantId: priced.restaurant._id,
      restaurantName: priced.restaurant.name,
      restaurantImageKey: priced.restaurant.imageKey,
      items: priced.items.map((line) => ({
        productId: new Types.ObjectId(line.productId),
        name: line.name,
        imageKey: line.imageKey,
        quantity: line.quantity,
        unitPriceCents: toCents(line.unitPrice),
        selectedOptions: line.selectedOptions.map((option) => ({
          groupId: new Types.ObjectId(option.groupId),
          groupName: option.groupName,
          optionId: new Types.ObjectId(option.optionId),
          optionName: option.optionName,
          priceDeltaCents: toCents(option.priceDelta),
        })),
        ...(line.notes ? { notes: line.notes } : {}),
      })),
      status: OrderStatus.PENDING,
      deliveryAddress: {
        label: address.label ?? 'Home',
        line1: address.line1.trim(),
        ...(address.line2?.trim() ? { line2: address.line2.trim() } : {}),
        city: address.city.trim(),
        state: address.state.trim(),
        postalCode: address.postalCode.trim(),
        country: address.country.trim(),
        ...(address.instructions?.trim() ? { instructions: address.instructions.trim() } : {}),
        isDefault: false,
        ...(address.lat !== undefined && address.lng !== undefined
          ? { coordinates: { lat: address.lat, lng: address.lng } }
          : {}),
      },
      totals: {
        subtotalCents: priced.subtotalCents,
        deliveryFeeCents: priced.deliveryFeeCents,
        serviceFeeCents: priced.serviceFeeCents,
        discountCents: priced.discountCents,
        taxCents: priced.taxCents,
        totalCents: priced.totalCents,
      },
      paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      ...(priced.promotion
        ? {
            promotionId: priced.promotion.promotion._id,
            couponCode: priced.promotion.code,
          }
        : {}),
      ...(dto.notes?.trim() ? { notes: dto.notes.trim() } : {}),
      placedAt: now,
      statusHistory: [
        {
          status: OrderStatus.PENDING,
          at: now,
          byUserId: new Types.ObjectId(actor.id),
          reason: 'Order placed.',
        },
      ],
    });

    try {
      await order.save();
    } catch (error) {
      if (isDuplicateKey(error)) {
        const duplicate = await this.orderModel
          .findOne({ idempotencyKey: dto.idempotencyKey })
          .exec();
        if (duplicate && duplicate.customerId.toString() === actor.id) {
          return toOrderResponse(duplicate);
        }
        throw new ConflictException({
          code: 'duplicate_order',
          message: 'This checkout was already submitted.',
        });
      }
      throw error;
    }

    try {
      if (priced.promotion) {
        await this.promotionsService.redeem(
          priced.promotion,
          order._id.toString(),
          actor.id,
          priced.discountCents,
        );
      }

      const delivery = await this.deliveriesService.ensureForOrder(order);
      order.deliveryId = delivery._id;
      await order.save();
    } catch (error) {
      await this.promotionsService.releaseForOrder(order._id.toString());
      await this.orderModel.deleteOne({ _id: order._id }).exec();
      throw error;
    }

    return toOrderResponse(order);
  }

  async list(actor: AuthenticatedUser, query: OrderQueryDto = {}): Promise<OrderResponse[]> {
    const filter: FilterQuery<OrderDocument> = {};

    if (actor.role === UserRole.CUSTOMER) {
      filter.customerId = new Types.ObjectId(actor.id);
      if (query.restaurantId) filter.restaurantId = new Types.ObjectId(query.restaurantId);
    } else if (actor.role === UserRole.RESTAURANT_OWNER) {
      if (!actor.restaurantId) return [];
      filter.restaurantId = new Types.ObjectId(actor.restaurantId);
    } else if (actor.role === UserRole.DRIVER) {
      if (!actor.driverId) return [];
      const deliveries = await this.deliveryModel
        .find({ driverId: new Types.ObjectId(actor.driverId) })
        .select('orderId')
        .exec();
      filter._id = { $in: deliveries.map((delivery) => delivery.orderId) };
    } else if (actor.role === UserRole.ADMIN) {
      if (query.customerId) filter.customerId = new Types.ObjectId(query.customerId);
      if (query.restaurantId) filter.restaurantId = new Types.ObjectId(query.restaurantId);
    } else {
      return [];
    }

    if (query.status) filter.status = query.status;

    const orders = await this.orderModel
      .find(filter)
      .sort({ placedAt: -1 })
      .limit(200)
      .exec();

    return orders.map(toOrderResponse);
  }

  async getActive(actor: AuthenticatedUser): Promise<OrderResponse | null> {
    const active = {
      $in: [
        OrderStatus.PENDING,
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
      ],
    };
    const filter: FilterQuery<OrderDocument> = { status: active };

    if (actor.role === UserRole.CUSTOMER) {
      filter.customerId = new Types.ObjectId(actor.id);
    } else if (actor.role === UserRole.RESTAURANT_OWNER) {
      if (!actor.restaurantId) return null;
      filter.restaurantId = new Types.ObjectId(actor.restaurantId);
    } else if (actor.role === UserRole.DRIVER) {
      if (!actor.driverId) return null;
      const delivery = await this.deliveryModel
        .findOne({
          driverId: new Types.ObjectId(actor.driverId),
          status: {
            $in: [
              DeliveryStatus.ASSIGNED,
              DeliveryStatus.PICKED_UP,
              DeliveryStatus.ON_THE_WAY,
            ],
          },
        })
        .sort({ updatedAt: -1 })
        .exec();
      if (!delivery) return null;
      filter._id = delivery.orderId;
    }

    const order = await this.orderModel.findOne(filter).sort({ placedAt: -1 }).exec();
    return order ? toOrderResponse(order) : null;
  }

  async getById(actor: AuthenticatedUser, orderId: string): Promise<OrderResponse> {
    const order = await this.getDocument(orderId);
    await this.assertCanView(actor, order);
    return toOrderResponse(order);
  }

  async getStatusHistory(
    actor: AuthenticatedUser,
    orderId: string,
  ): Promise<ReturnType<typeof toTrackingEvents>> {
    const order = await this.getDocument(orderId);
    await this.assertCanView(actor, order);
    const delivery = await this.deliveryModel.findOne({ orderId: order._id }).exec();
    return toTrackingEvents(order, delivery);
  }

  async transition(
    actor: AuthenticatedUser,
    orderId: string,
    action: OrderAction,
    reason?: string,
  ): Promise<OrderResponse> {
    const order = await this.getDocument(orderId);
    this.assertCanTransition(actor, order, action);

    if (action === OrderAction.COMPLETE) {
      throw new BadRequestException({
        code: 'completion_owned_by_delivery',
        message: 'An order is completed only when its delivery is delivered.',
      });
    }

    const target = ORDER_ACTION_TARGET[action];
    if (!canTransitionOrderStatus(order.status as OrderStatus, target)) {
      throw new ConflictException({
        code: 'invalid_order_transition',
        message: `An order in ${order.status} cannot transition to ${target}.`,
      });
    }

    if (action === OrderAction.CANCEL && actor.role === UserRole.CUSTOMER) {
      const delivery = await this.deliveryModel.findOne({ orderId: order._id }).exec();
      if (
        delivery &&
        (delivery.status === DeliveryStatus.PICKED_UP ||
          delivery.status === DeliveryStatus.ON_THE_WAY ||
          delivery.status === DeliveryStatus.DELIVERED)
      ) {
        throw new ConflictException({
          code: 'delivery_in_progress',
          message: 'This order has already left the restaurant and can no longer be cancelled.',
        });
      }
    }

    const stamp = STATUS_STAMPS[target];
    const now = new Date();
    const updated = await this.orderModel
      .findOneAndUpdate(
        { _id: order._id, status: order.status },
        {
          $set: {
            status: target,
            ...(stamp ? { [stamp.field]: now } : {}),
          },
          $push: {
            statusHistory: {
              status: target,
              at: now,
              byUserId: new Types.ObjectId(actor.id),
              ...(reason?.trim() ? { reason: reason.trim() } : {}),
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException({
        code: 'invalid_order_transition',
        message: 'The order changed while the request was being processed. Refresh and try again.',
      });
    }

    if (target === OrderStatus.CANCELLED || target === OrderStatus.REJECTED) {
      await this.deliveriesService.cancelForOrder(
        updated._id.toString(),
        reason ?? `Order ${target.toLowerCase()}.`,
        actor.id,
      );
      await this.promotionsService.releaseForOrder(updated._id.toString());
    }

    if (target === OrderStatus.READY) {
      try {
        await this.deliveriesService.autoAssignForOrder(updated._id.toString());
      } catch (error) {
        this.logger.warn(
          `Automatic assignment failed for order ${updated.code}: ${(error as Error).message}`,
        );
      }
    }

    return toOrderResponse(updated);
  }

  async getDocument(orderId: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException({
        code: 'order_not_found',
        message: 'That order could not be found.',
      });
    }

    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException({
        code: 'order_not_found',
        message: 'That order could not be found.',
      });
    }
    return order;
  }

  private async assertCanView(
    actor: AuthenticatedUser,
    order: OrderDocument,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;

    if (actor.role === UserRole.CUSTOMER) {
      if (order.customerId.toString() === actor.id) return;
    } else if (actor.role === UserRole.RESTAURANT_OWNER) {
      if (actor.restaurantId && order.restaurantId.toString() === actor.restaurantId) return;
    } else if (actor.role === UserRole.DRIVER && actor.driverId) {
      const assigned = await this.deliveryModel.exists({
        orderId: order._id,
        driverId: new Types.ObjectId(actor.driverId),
      });
      if (assigned) return;
    }

    throw new ForbiddenException({
      code: 'forbidden',
      message: 'You do not have access to this order.',
    });
  }

  private assertCanTransition(
    actor: AuthenticatedUser,
    order: OrderDocument,
    action: OrderAction,
  ): void {
    if (actor.role === UserRole.CUSTOMER) {
      if (action !== OrderAction.CANCEL || order.customerId.toString() !== actor.id) {
        throw new ForbiddenException({
          code: 'forbidden',
          message: 'Customers may only cancel their own orders.',
        });
      }
      return;
    }

    if (actor.role === UserRole.RESTAURANT_OWNER) {
      const allowed: OrderAction[] = [
        OrderAction.ACCEPT,
        OrderAction.REJECT,
        OrderAction.PREPARE,
        OrderAction.READY,
      ];
      if (!allowed.includes(action)) {
        throw new ForbiddenException({
          code: 'forbidden',
          message: 'Restaurant owners cannot perform that order action.',
        });
      }
      if (!actor.restaurantId || order.restaurantId.toString() !== actor.restaurantId) {
        throw new ForbiddenException({
          code: 'forbidden',
          message: 'This order does not belong to your restaurant.',
        });
      }
      return;
    }

    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Your account cannot manage orders.',
      });
    }
  }

  private resolvePaymentMethod(user: UserDocument, paymentMethodId: string): {
    type: string;
    label: string;
    brand?: string;
    last4?: string;
    expiry?: string;
    isDefault: boolean;
  } {
    const stored =
      Types.ObjectId.isValid(paymentMethodId)
        ? (user.paymentMethods ?? []).find(
            (method) => String((method as unknown as { _id: Types.ObjectId })._id) === paymentMethodId,
          )
        : undefined;

    if (stored) {
      return {
        type: stored.type,
        label: stored.label,
        ...(stored.brand ? { brand: stored.brand } : {}),
        ...(stored.last4 ? { last4: stored.last4 } : {}),
        ...(stored.expiry ? { expiry: stored.expiry } : {}),
        isDefault: Boolean(stored.isDefault),
      };
    }

    if ((user.paymentMethods ?? []).length > 0) {
      throw new BadRequestException({
        code: 'payment_method_not_found',
        message: 'Choose one of your saved payment methods.',
        details: { paymentMethodId: ['That payment method is not on your account.'] },
      });
    }

    // No saved method exists: record a cash-on-delivery intent. No card data is
    // ever collected, and a future gateway can replace this snapshot.
    return {
      type: PaymentType.CASH,
      label: 'Cash on delivery',
      isDefault: true,
    };
  }
}
