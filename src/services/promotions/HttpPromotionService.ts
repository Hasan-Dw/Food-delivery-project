import type {
  Promotion,
  PromotionInput,
  PromotionPolicy,
  PromotionQuery,
  PromotionUsage,
  PromotionValidation,
} from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { PromotionService, ValidatePromotionInput } from './PromotionService';

function idPath(base: string, promotionId: string): string {
  return `${base}/${encodeURIComponent(promotionId)}`;
}

export class HttpPromotionService implements PromotionService {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<Promotion[]> {
    const response = await this.client.get<Promotion[]>('/promotions');
    return response.data;
  }

  async validate(input: ValidatePromotionInput): Promise<PromotionValidation> {
    const response = await this.client.post<PromotionValidation>('/promotions/validate', {
      code: input.code,
      ...(input.restaurantId ? { restaurantId: input.restaurantId } : {}),
      ...(input.subtotal !== undefined ? { subtotal: input.subtotal } : {}),
      ...(input.deliveryFee !== undefined ? { deliveryFee: input.deliveryFee } : {}),
    });
    return response.data;
  }

  async listAdmin(query: PromotionQuery = {}): Promise<Promotion[]> {
    const response = await this.client.get<Promotion[]>('/promotions/admin', {
      query: {
        ...(query.scope ? { scope: query.scope } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.restaurantId ? { restaurantId: query.restaurantId } : {}),
        ...(query.q ? { q: query.q } : {}),
      },
    });
    return response.data;
  }

  async create(input: PromotionInput): Promise<Promotion> {
    const response = await this.client.post<Promotion>('/promotions', input);
    return response.data;
  }

  async update(
    promotionId: string,
    input: Partial<PromotionInput>,
  ): Promise<Promotion> {
    const response = await this.client.patch<Promotion>(
      idPath('/promotions', promotionId),
      input,
    );
    return response.data;
  }

  async setStatus(promotionId: string, active: boolean): Promise<Promotion> {
    const response = await this.client.patch<Promotion>(
      `${idPath('/promotions', promotionId)}/status`,
      { active },
    );
    return response.data;
  }

  async remove(promotionId: string): Promise<void> {
    await this.client.delete(idPath('/promotions', promotionId));
  }

  async getUsage(promotionId: string): Promise<PromotionUsage> {
    const response = await this.client.get<PromotionUsage>(
      `${idPath('/promotions', promotionId)}/usage`,
    );
    return response.data;
  }

  async listMine(): Promise<Promotion[]> {
    const response = await this.client.get<Promotion[]>(
      '/restaurant-promotions',
    );
    return response.data;
  }

  async createMine(input: PromotionInput): Promise<Promotion> {
    const response = await this.client.post<Promotion>(
      '/restaurant-promotions',
      input,
    );
    return response.data;
  }

  async updateMine(
    promotionId: string,
    input: Partial<PromotionInput>,
  ): Promise<Promotion> {
    const response = await this.client.patch<Promotion>(
      idPath('/restaurant-promotions', promotionId),
      input,
    );
    return response.data;
  }

  async setStatusMine(
    promotionId: string,
    active: boolean,
  ): Promise<Promotion> {
    const response = await this.client.patch<Promotion>(
      `${idPath('/restaurant-promotions', promotionId)}/status`,
      { active },
    );
    return response.data;
  }

  async removeMine(promotionId: string): Promise<void> {
    await this.client.delete(idPath('/restaurant-promotions', promotionId));
  }

  async getMyUsage(promotionId: string): Promise<PromotionUsage> {
    const response = await this.client.get<PromotionUsage>(
      `${idPath('/restaurant-promotions', promotionId)}/usage`,
    );
    return response.data;
  }

  async getPolicy(): Promise<PromotionPolicy> {
    const response = await this.client.get<PromotionPolicy>(
      '/restaurant-promotions/policy',
    );
    return response.data;
  }
}
