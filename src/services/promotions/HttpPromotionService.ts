import type { Promotion, PromotionValidation } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { PromotionService, ValidatePromotionInput } from './PromotionService';

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
    });
    return response.data;
  }
}
