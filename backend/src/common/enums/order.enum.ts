/** Customer purchase lifecycle. Delivery transportation has its own enum. */
export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/** Role-authorized lifecycle actions exposed by the orders API. */
export enum OrderAction {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  PREPARE = 'PREPARE',
  READY = 'READY',
  COMPLETE = 'COMPLETE',
  CANCEL = 'CANCEL',
}

/**
 * A completed order is only produced by successful delivery completion. The
 * `COMPLETE` action exists in the shared frontend contract for completeness but
 * the backend deliberately rejects manual completion.
 */
export const ORDER_ACTION_TARGET: Record<OrderAction, OrderStatus> = {
  [OrderAction.ACCEPT]: OrderStatus.ACCEPTED,
  [OrderAction.REJECT]: OrderStatus.REJECTED,
  [OrderAction.PREPARE]: OrderStatus.PREPARING,
  [OrderAction.READY]: OrderStatus.READY,
  [OrderAction.COMPLETE]: OrderStatus.COMPLETED,
  [OrderAction.CANCEL]: OrderStatus.CANCELLED,
};

/** Allowed order status transitions, mirroring the frontend lifecycle. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.ACCEPTED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.CANCELLED]: [],
};

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function isActiveOrderStatus(status: OrderStatus): boolean {
  return (
    status === OrderStatus.PENDING ||
    status === OrderStatus.ACCEPTED ||
    status === OrderStatus.PREPARING ||
    status === OrderStatus.READY
  );
}
