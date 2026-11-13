import type { Types } from 'mongoose';
import { fromCents } from '../common/utils/money.util';
import { OrderStatus } from '../common/enums/order.enum';
import { DeliveryStatus } from '../common/enums/delivery.enum';
import type { Delivery } from '../deliveries/schemas/delivery.schema';
import type { OrderDocument } from './schemas/order.schema';
import type {
  OrderAddressResponse,
  OrderItemResponse,
  OrderPaymentMethodResponse,
  OrderResponse,
  OrderTotalsResponse,
} from './interfaces/order-response.interface';

function idOf(value: unknown): string {
  return String((value as { _id: Types.ObjectId })._id);
}

function iso(value?: Date | null): string | undefined {
  return value ? value.toISOString() : undefined;
}

export function toOrderResponse(order: OrderDocument): OrderResponse {
  const items: OrderItemResponse[] = (order.items ?? []).map((item) => ({
    id: idOf(item),
    productId: item.productId.toString(),
    name: item.name,
    imageKey: item.imageKey,
    quantity: item.quantity,
    unitPrice: fromCents(item.unitPriceCents),
    selectedOptions: (item.selectedOptions ?? []).map((option) => ({
      groupId: option.groupId.toString(),
      groupName: option.groupName,
      optionId: option.optionId.toString(),
      optionName: option.optionName,
      priceDelta: fromCents(option.priceDeltaCents),
    })),
  }));

  const totals: OrderTotalsResponse = {
    subtotal: fromCents(order.totals.subtotalCents),
    deliveryFee: fromCents(order.totals.deliveryFeeCents),
    serviceFee: fromCents(order.totals.serviceFeeCents),
    discount: fromCents(order.totals.discountCents),
    tax: fromCents(order.totals.taxCents),
    total: fromCents(order.totals.totalCents),
  };

  const paymentMethod: OrderPaymentMethodResponse = {
    id: idOf(order.paymentMethod),
    type: order.paymentMethod.type,
    label: order.paymentMethod.label,
    isDefault: Boolean(order.paymentMethod.isDefault),
  };
  if (order.paymentMethod.brand) paymentMethod.brand = order.paymentMethod.brand;
  if (order.paymentMethod.last4) paymentMethod.last4 = order.paymentMethod.last4;
  if (order.paymentMethod.expiry) paymentMethod.expiry = order.paymentMethod.expiry;

  const address = order.deliveryAddress;
  const deliveryAddress: OrderAddressResponse = {
    id: idOf(address),
    label: address.label,
    line1: address.line1,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: Boolean(address.isDefault),
  };
  if (address.line2) deliveryAddress.line2 = address.line2;
  if (address.instructions) deliveryAddress.instructions = address.instructions;
  if (address.coordinates) {
    deliveryAddress.coordinates = {
      lat: address.coordinates.lat,
      lng: address.coordinates.lng,
    };
  }

  const response: OrderResponse = {
    id: order._id.toString(),
    code: order.code,
    customerId: order.customerId.toString(),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    restaurantId: order.restaurantId.toString(),
    restaurantName: order.restaurantName,
    restaurantImageKey: order.restaurantImageKey,
    items,
    status: order.status,
    placedAt: (order.placedAt ?? order.createdAt ?? new Date()).toISOString(),
    deliveryAddress,
    totals,
    paymentMethod,
  };

  if (order.acceptedAt) response.acceptedAt = iso(order.acceptedAt);
  if (order.preparingAt) response.preparingAt = iso(order.preparingAt);
  if (order.readyAt) response.readyAt = iso(order.readyAt);
  if (order.completedAt) response.completedAt = iso(order.completedAt);
  if (order.rejectedAt) response.rejectedAt = iso(order.rejectedAt);
  if (order.cancelledAt) response.cancelledAt = iso(order.cancelledAt);
  if (order.deliveryId) response.deliveryId = order.deliveryId.toString();
  if (order.couponCode) response.couponCode = order.couponCode;
  if (order.notes) response.notes = order.notes;

  return response;
}

const ORDER_LABELS: Partial<
  Record<OrderStatus, { label: string; description: string }>
> = {
  [OrderStatus.PENDING]: {
    label: 'Order placed',
    description: 'Your order was sent to the restaurant.',
  },
  [OrderStatus.ACCEPTED]: {
    label: 'Order accepted',
    description: 'The restaurant accepted your order.',
  },
  [OrderStatus.PREPARING]: {
    label: 'In the kitchen',
    description: 'Your order is being prepared fresh.',
  },
  [OrderStatus.READY]: {
    label: 'Packed & ready',
    description: 'Sealed, labelled and waiting for a delivery partner.',
  },
  [OrderStatus.COMPLETED]: {
    label: 'Delivered',
    description: 'Your order was delivered.',
  },
  [OrderStatus.REJECTED]: {
    label: 'Order rejected',
    description: 'The restaurant could not accept this order.',
  },
  [OrderStatus.CANCELLED]: {
    label: 'Order cancelled',
    description: 'This order was cancelled before delivery completed.',
  },
};

/**
 * Customer-facing timeline. It derives milestones from the persisted order and
 * delivery documents; it never invents a GPS position or live flag.
 */
export function toTrackingEvents(
  order: OrderDocument,
  delivery?: Delivery | null,
): Array<{
  kind: 'order' | 'delivery';
  status: string;
  label: string;
  description: string;
  timestamp?: string;
  completed: boolean;
}> {
  if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
    const terminal = ORDER_LABELS[order.status as OrderStatus]!;
    return [
      {
        kind: 'order',
        status: OrderStatus.PENDING,
        label: ORDER_LABELS[OrderStatus.PENDING]!.label,
        description: ORDER_LABELS[OrderStatus.PENDING]!.description,
        timestamp: order.placedAt.toISOString(),
        completed: true,
      },
      {
        kind: 'order',
        status: order.status,
        label: terminal.label,
        description: terminal.description,
        timestamp:
          iso(order.rejectedAt ?? order.cancelledAt ?? order.acceptedAt) ??
          order.placedAt.toISOString(),
        completed: true,
      },
    ];
  }

  const reached = (statuses: OrderStatus[]) =>
    statuses.includes(order.status as OrderStatus);
  const deliveryReached = (statuses: DeliveryStatus[]) =>
    Boolean(delivery && statuses.includes(delivery.status as DeliveryStatus));

  const delivered =
    order.status === OrderStatus.COMPLETED ||
    delivery?.status === DeliveryStatus.DELIVERED;
  const destination = order.deliveryAddress;

  return [
    {
      kind: 'order',
      status: OrderStatus.PENDING,
      label: ORDER_LABELS[OrderStatus.PENDING]!.label,
      description: ORDER_LABELS[OrderStatus.PENDING]!.description,
      timestamp: order.placedAt.toISOString(),
      completed: true,
    },
    {
      kind: 'order',
      status: OrderStatus.PREPARING,
      label: ORDER_LABELS[OrderStatus.PREPARING]!.label,
      description: ORDER_LABELS[OrderStatus.PREPARING]!.description,
      timestamp: iso(order.preparingAt ?? order.acceptedAt),
      completed: reached([
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COMPLETED,
      ]),
    },
    {
      kind: 'order',
      status: OrderStatus.READY,
      label: ORDER_LABELS[OrderStatus.READY]!.label,
      description: ORDER_LABELS[OrderStatus.READY]!.description,
      timestamp: iso(order.readyAt),
      completed: reached([OrderStatus.READY, OrderStatus.COMPLETED]),
    },
    {
      kind: 'delivery',
      status: DeliveryStatus.ASSIGNED,
      label: 'Driver assigned',
      description: 'A Savora delivery partner is heading to the restaurant.',
      timestamp: iso(delivery?.assignedAt),
      completed: deliveryReached([
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.ON_THE_WAY,
        DeliveryStatus.DELIVERED,
      ]),
    },
    {
      kind: 'delivery',
      status: DeliveryStatus.ON_THE_WAY,
      label: 'On the way',
      description: 'Your delivery partner is heading to you.',
      timestamp: iso(delivery?.pickedUpAt),
      completed: deliveryReached([
        DeliveryStatus.ON_THE_WAY,
        DeliveryStatus.DELIVERED,
      ]),
    },
    {
      kind: 'delivery',
      status: DeliveryStatus.DELIVERED,
      label: delivered ? 'Delivered' : 'Delivery',
      description: delivered
        ? `Left at ${destination.line1}.`
        : 'Estimated arrival based on the current route.',
      timestamp: iso(delivery?.deliveredAt ?? delivery?.estimatedArrivalAt),
      completed: delivered,
    },
  ];
}
