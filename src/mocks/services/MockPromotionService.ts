import type { Promotion } from '@/types';
import { promotions } from '@/mocks/data/promotions';
import { delay } from '@/mocks/utils/delay';
import type { PromotionService } from '@/services/promotions/PromotionService';

export class MockPromotionService implements PromotionService {
  async list(): Promise<Promotion[]> {
    await delay(320);
    return promotions;
  }
}
