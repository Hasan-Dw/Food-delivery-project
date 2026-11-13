import type { Types } from 'mongoose';
import type {
  Delivery,
  DeliveryAssignmentEvent,
  DeliveryDocument,
} from './schemas/delivery.schema';

export interface DeliveryLocationResponse {
  driverId: string;
  deliveryId: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKph?: number;
  updatedAt: string;
}

export interface DeliveryAssignmentEventResponse {
  id: string;
  deliveryId: string;
  previousDriverId: string | null;
  newDriverId: string | null;
  driverId: string | null;
  driverName: string | null;
  action: string;
  source: string;
  adminId?: string | null;
  reason?: string;
  at: string;
}

export interface DeliveryAutoAssignmentResponse {
  attempts: number;
  lastAttemptAt?: string;
  lastTrigger?: string;
  status: string;
  reason?: string;
}

export interface DeliveryResponse {
  id: string;
  orderId: string;
  driverId: string | null;
  restaurantId: string;
  customerId: string;
  status: string;
  estimatedArrivalAt?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  driverLocation: DeliveryLocationResponse | null;
  assignmentHistory: DeliveryAssignmentEventResponse[];
  autoAssignment?: DeliveryAutoAssignmentResponse;
  createdAt: string;
  updatedAt: string;
}

function idOf(value: unknown): string {
  return String((value as { _id: Types.ObjectId })._id);
}

function toEventResponse(
  deliveryId: string,
  event: DeliveryAssignmentEvent,
): DeliveryAssignmentEventResponse {
  const response: DeliveryAssignmentEventResponse = {
    id: idOf(event),
    deliveryId,
    previousDriverId: event.previousDriverId ? event.previousDriverId.toString() : null,
    newDriverId: event.newDriverId ? event.newDriverId.toString() : null,
    driverId: event.driverId ? event.driverId.toString() : null,
    driverName: event.driverName ?? null,
    action: event.action,
    source: event.source,
    adminId: event.adminId ? event.adminId.toString() : null,
    at: event.at.toISOString(),
  };

  if (event.reason) response.reason = event.reason;
  return response;
}

export function toDeliveryResponse(delivery: DeliveryDocument): DeliveryResponse {
  const deliveryId = delivery._id.toString();

  const location = delivery.driverLocation
    ? {
        driverId: delivery.driverId ? delivery.driverId.toString() : '',
        deliveryId,
        lat: delivery.driverLocation.lat,
        lng: delivery.driverLocation.lng,
        ...(delivery.driverLocation.heading !== undefined
          ? { heading: delivery.driverLocation.heading }
          : {}),
        ...(delivery.driverLocation.speedKph !== undefined
          ? { speedKph: delivery.driverLocation.speedKph }
          : {}),
        updatedAt: delivery.driverLocation.updatedAt.toISOString(),
      }
    : null;

  const response: DeliveryResponse = {
    id: deliveryId,
    orderId: delivery.orderId.toString(),
    driverId: delivery.driverId ? delivery.driverId.toString() : null,
    restaurantId: delivery.restaurantId.toString(),
    customerId: delivery.customerId.toString(),
    status: delivery.status,
    driverLocation: location,
    assignmentHistory: (delivery.assignmentHistory ?? []).map((event) =>
      toEventResponse(deliveryId, event),
    ),
    createdAt: (delivery.createdAt ?? new Date()).toISOString(),
    updatedAt: (delivery.updatedAt ?? new Date()).toISOString(),
  };

  if (delivery.estimatedArrivalAt) {
    response.estimatedArrivalAt = delivery.estimatedArrivalAt.toISOString();
  }
  if (delivery.assignedAt) response.assignedAt = delivery.assignedAt.toISOString();
  if (delivery.pickedUpAt) response.pickedUpAt = delivery.pickedUpAt.toISOString();
  if (delivery.deliveredAt) response.deliveredAt = delivery.deliveredAt.toISOString();
  if (delivery.cancelledAt) response.cancelledAt = delivery.cancelledAt.toISOString();

  if (delivery.autoAssignment) {
    response.autoAssignment = {
      attempts: delivery.autoAssignment.attempts,
      lastTrigger: delivery.autoAssignment.lastTrigger,
      status: delivery.autoAssignment.status,
      ...(delivery.autoAssignment.lastAttemptAt
        ? { lastAttemptAt: delivery.autoAssignment.lastAttemptAt.toISOString() }
        : {}),
      ...(delivery.autoAssignment.reason
        ? { reason: delivery.autoAssignment.reason }
        : {}),
    };
  }

  return response;
}

export type { Delivery };
