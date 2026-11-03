import type { Promotion } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { PromotionService } from './PromotionService';

export class HttpPromotionService implements PromotionService {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<Promotion[]> {
    const response = await this.client.get<Promotion[]>('/promotions');
    return response.data;
  }
}
