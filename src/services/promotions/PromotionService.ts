import type { Promotion } from '@/types';

export interface PromotionService {
  list(): Promise<Promotion[]>;
}
