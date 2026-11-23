import type {
  Promotion,
  PromotionInput,
  PromotionPolicy,
  PromotionQuery,
  PromotionUsage,
  PromotionValidation,
} from '@/types';

export interface ValidatePromotionInput {
  code: string;
  restaurantId?: string;
  /** Display-only subtotal for the preview. Order creation recalculates it. */
  subtotal?: number;
  /** Display-only delivery fee, needed to preview free-delivery coupons. */
  deliveryFee?: number;
}

export interface PromotionService {
  list(): Promise<Promotion[]>;
  /** Server-side coupon preview. Order creation validates the code again. */
  validate(input: ValidatePromotionInput): Promise<PromotionValidation>;

  // ── Administrator management ────────────────────────────────────────────
  listAdmin(query?: PromotionQuery): Promise<Promotion[]>;
  create(input: PromotionInput): Promise<Promotion>;
  update(promotionId: string, input: Partial<PromotionInput>): Promise<Promotion>;
  setStatus(promotionId: string, active: boolean): Promise<Promotion>;
  remove(promotionId: string): Promise<void>;
  getUsage(promotionId: string): Promise<PromotionUsage>;

  // ── Restaurant-owner management ─────────────────────────────────────────
  // The API derives ownership from the authenticated account; the browser
  // never supplies a restaurant id for these calls.
  listMine(): Promise<Promotion[]>;
  createMine(input: PromotionInput): Promise<Promotion>;
  updateMine(
    promotionId: string,
    input: Partial<PromotionInput>,
  ): Promise<Promotion>;
  setStatusMine(promotionId: string, active: boolean): Promise<Promotion>;
  removeMine(promotionId: string): Promise<void>;
  getMyUsage(promotionId: string): Promise<PromotionUsage>;
  getPolicy(): Promise<PromotionPolicy>;
}
