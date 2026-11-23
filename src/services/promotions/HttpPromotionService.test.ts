import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/services/api/client';
import { HttpPromotionService } from './HttpPromotionService';

function createClient() {
  return {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: { id: 'promo-1' } }),
    patch: vi.fn().mockResolvedValue({ data: { id: 'promo-1' } }),
    delete: vi.fn().mockResolvedValue({ data: undefined }),
  } as unknown as ApiClient;
}

describe('HttpPromotionService', () => {
  it('sends the delivery fee so free-delivery codes can be previewed', async () => {
    const client = createClient();
    const service = new HttpPromotionService(client);

    await service.validate({
      code: 'FREEDEL',
      restaurantId: 'restaurant-1',
      subtotal: 25,
      deliveryFee: 3,
    });

    expect(client.post).toHaveBeenCalledWith('/promotions/validate', {
      code: 'FREEDEL',
      restaurantId: 'restaurant-1',
      subtotal: 25,
      deliveryFee: 3,
    });
  });

  it('forwards admin filters without empty query values', async () => {
    const client = createClient();
    const service = new HttpPromotionService(client);

    await service.listAdmin({
      scope: 'RESTAURANT',
      status: 'ACTIVE',
      restaurantId: 'restaurant-1',
      q: 'welcome',
    });

    expect(client.get).toHaveBeenCalledWith('/promotions/admin', {
      query: {
        scope: 'RESTAURANT',
        status: 'ACTIVE',
        restaurantId: 'restaurant-1',
        q: 'welcome',
      },
    });

    await service.listAdmin({});

    expect(client.get).toHaveBeenLastCalledWith('/promotions/admin', {
      query: {},
    });
  });

  it('uses the owner routes and never sends a scope or restaurant id', async () => {
    const client = createClient();
    const service = new HttpPromotionService(client);

    await service.createMine({
      code: 'OWNER10',
      title: 'Owner coupon',
      discountType: 'PERCENTAGE',
      value: 10,
      expiresAt: '2030-01-01T00:00:00.000Z',
    });
    await service.updateMine('promo-1', { title: 'Updated' });
    await service.setStatusMine('promo-1', false);
    await service.removeMine('promo-1');
    await service.getMyUsage('promo-1');

    expect(client.post).toHaveBeenCalledWith('/restaurant-promotions', {
      code: 'OWNER10',
      title: 'Owner coupon',
      discountType: 'PERCENTAGE',
      value: 10,
      expiresAt: '2030-01-01T00:00:00.000Z',
    });
    expect(client.patch).toHaveBeenNthCalledWith(
      1,
      '/restaurant-promotions/promo-1',
      { title: 'Updated' },
    );
    expect(client.patch).toHaveBeenNthCalledWith(
      2,
      '/restaurant-promotions/promo-1/status',
      { active: false },
    );
    expect(client.delete).toHaveBeenCalledWith('/restaurant-promotions/promo-1');
    expect(client.get).toHaveBeenCalledWith(
      '/restaurant-promotions/promo-1/usage',
    );
  });

  it('uses dedicated admin status and usage endpoints', async () => {
    const client = createClient();
    const service = new HttpPromotionService(client);

    await service.create({
      code: 'PLATFORM5',
      title: 'Platform coupon',
      scope: 'GLOBAL',
      discountType: 'FIXED',
      value: 5,
      expiresAt: '2030-01-01T00:00:00.000Z',
    });
    await service.setStatus('promo-1', true);
    await service.getUsage('promo-1');
    await service.remove('promo-1');

    expect(client.post).toHaveBeenCalledWith('/promotions', {
      code: 'PLATFORM5',
      title: 'Platform coupon',
      scope: 'GLOBAL',
      discountType: 'FIXED',
      value: 5,
      expiresAt: '2030-01-01T00:00:00.000Z',
    });
    expect(client.patch).toHaveBeenCalledWith('/promotions/promo-1/status', {
      active: true,
    });
    expect(client.get).toHaveBeenCalledWith('/promotions/promo-1/usage');
    expect(client.delete).toHaveBeenCalledWith('/promotions/promo-1');
  });

  it('loads the owner policy from the API', async () => {
    const client = createClient();
    const service = new HttpPromotionService(client);

    await service.getPolicy();

    expect(client.get).toHaveBeenCalledWith('/restaurant-promotions/policy');
  });
});
