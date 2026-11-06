import type {
  Delivery,
  DeliveryAction,
  DeliveryAutoAssignmentResult,
  DriverLocationInput,
} from '@/types';
import type { ApiClient } from '@/services/api/client';
import type {
  AutoAssignDeliveryOptions,
  DeliveryAssignmentOptions,
  DeliveryService,
} from './DeliveryService';

/**
 * HTTP adapter for the delivery contract. `actorId` is sent for audit display;
 * the server must derive the authoritative administrator from the token.
 */
export class HttpDeliveryService implements DeliveryService {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<Delivery[]> {
    const response = await this.client.get<Delivery[]>('/deliveries');
    return response.data;
  }

  async getById(deliveryId: string): Promise<Delivery> {
    const response = await this.client.get<Delivery>(
      `/deliveries/${encodeURIComponent(deliveryId)}`,
    );
    return response.data;
  }

  async getByOrderId(orderId: string): Promise<Delivery> {
    const response = await this.client.get<Delivery>(
      `/deliveries/by-order/${encodeURIComponent(orderId)}`,
    );
    return response.data;
  }

  async getActiveForDriver(driverId: string): Promise<Delivery | null> {
    const response = await this.client.get<Delivery | null>('/deliveries/active', {
      query: { driverId },
    });
    return response.data ?? null;
  }

  async assign(
    deliveryId: string,
    driverId: string,
    options: DeliveryAssignmentOptions = {},
  ): Promise<Delivery> {
    const response = await this.client.post<Delivery>(
      `/deliveries/${encodeURIComponent(deliveryId)}/assign`,
      { driverId, actorId: options.actorId ?? undefined },
    );
    return response.data;
  }

  async autoAssign(
    deliveryId: string,
    options: AutoAssignDeliveryOptions = {},
  ): Promise<DeliveryAutoAssignmentResult> {
    const response = await this.client.post<DeliveryAutoAssignmentResult>(
      `/deliveries/${encodeURIComponent(deliveryId)}/auto-assign`,
      {
        trigger: options.trigger,
        actorId: options.actorId ?? undefined,
        excludeDriverIds: options.excludeDriverIds,
        force: options.force,
        reason: options.reason,
      },
    );
    return response.data;
  }

  async unassign(
    deliveryId: string,
    reason: string,
    options: DeliveryAssignmentOptions = {},
  ): Promise<Delivery> {
    const response = await this.client.post<Delivery>(
      `/deliveries/${encodeURIComponent(deliveryId)}/unassign`,
      { reason, actorId: options.actorId ?? undefined },
    );
    return response.data;
  }

  async reassign(
    deliveryId: string,
    driverId: string,
    reason: string,
    options: DeliveryAssignmentOptions = {},
  ): Promise<Delivery> {
    const response = await this.client.post<Delivery>(
      `/deliveries/${encodeURIComponent(deliveryId)}/reassign`,
      { driverId, reason, actorId: options.actorId ?? undefined },
    );
    return response.data;
  }

  async transition(deliveryId: string, action: DeliveryAction): Promise<Delivery> {
    const response = await this.client.post<Delivery>(
      `/deliveries/${encodeURIComponent(deliveryId)}/transition`,
      { action },
    );
    return response.data;
  }

  async updateLocation(deliveryId: string, input: DriverLocationInput): Promise<Delivery> {
    const response = await this.client.put<Delivery>(
      `/deliveries/${encodeURIComponent(deliveryId)}/location`,
      input,
    );
    return response.data;
  }
}
