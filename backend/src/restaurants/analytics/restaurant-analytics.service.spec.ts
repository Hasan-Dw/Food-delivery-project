import { ForbiddenException } from '@nestjs/common';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { AccountStatus, UserRole } from '../../common/enums/user.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import type { OrderDocument } from '../../orders/schemas/order.schema';
import type { RestaurantDocument } from '../schemas/restaurant.schema';
import {
  RestaurantAnalyticsService,
  resolveAnalyticsWindow,
} from './restaurant-analytics.service';

const RESTAURANT_ID = new Types.ObjectId().toString();

function actor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: new Types.ObjectId().toString(),
    email: 'owner@example.com',
    role: UserRole.RESTAURANT_OWNER,
    accountStatus: AccountStatus.APPROVED,
    restaurantId: RESTAURANT_ID,
    ...overrides,
  };
}

function facet(overrides: Record<string, unknown> = {}) {
  return {
    currentPlaced: [
      { _id: 'PENDING', count: 1 },
      { _id: 'ACCEPTED', count: 1 },
      { _id: 'COMPLETED', count: 2 },
      { _id: 'CANCELLED', count: 1 },
    ],
    previousPlaced: [{ _id: 'COMPLETED', count: 1 }],
    currentCompleted: [
      { _id: null, revenueCents: 10_000, subtotalCents: 8_000, completedOrders: 2 },
    ],
    previousCompleted: [
      { _id: null, revenueCents: 5_000, subtotalCents: 4_000, completedOrders: 1 },
    ],
    placedBuckets: [] as Array<{ _id: string; totalOrders: number }>,
    completedBuckets: [] as Array<{
      _id: string;
      revenueCents: number;
      subtotalCents: number;
      completedOrders: number;
    }>,
    popularItems: [
      {
        _id: { productId: new Types.ObjectId(), name: 'Truffle Bowl' },
        quantitySold: 5,
        revenueCents: 6_250,
      },
      {
        _id: { productId: new Types.ObjectId(), name: 'Citrus Salad' },
        quantitySold: 2,
        revenueCents: 1_800,
      },
    ],
    monthlyPlaced: [],
    monthlyCompleted: [],
    weeklyPlaced: [],
    weeklyCompleted: [],
    ...overrides,
  };
}

function serviceWith(data: Record<string, unknown>): {
  service: RestaurantAnalyticsService;
  aggregate: jest.Mock;
} {
  const aggregate = jest.fn().mockReturnValue({ exec: async () => [data] });
  const orderModel = { aggregate } as unknown as Model<OrderDocument>;
  const restaurantModel = {
    exists: jest.fn().mockResolvedValue({ _id: RESTAURANT_ID }),
  } as unknown as Model<RestaurantDocument>;
  return {
    service: new RestaurantAnalyticsService(orderModel, restaurantModel),
    aggregate,
  };
}

describe('resolveAnalyticsWindow', () => {
  it('builds seven inclusive UTC day buckets for 7d', () => {
    const window = resolveAnalyticsWindow('7d', new Date('2026-11-13T12:00:00Z'));

    expect(window.start.toISOString()).toBe('2026-11-07T00:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-11-14T00:00:00.000Z');
    expect(window.previousStart.toISOString()).toBe('2026-10-31T00:00:00.000Z');
    expect(window.previousEnd.toISOString()).toBe('2026-11-07T00:00:00.000Z');
    expect(window.buckets).toHaveLength(7);
    expect(window.granularity).toBe('day');
  });

  it('builds thirty inclusive UTC day buckets for 30d', () => {
    const window = resolveAnalyticsWindow('30d', new Date('2026-11-13T12:00:00Z'));
    expect(window.buckets).toHaveLength(30);
    expect(window.previousStart.toISOString()).toBe('2026-09-15T00:00:00.000Z');
  });

  it('builds twelve month buckets and an aligned previous year for 12m', () => {
    const window = resolveAnalyticsWindow('12m', new Date('2026-11-13T12:00:00Z'));

    expect(window.start.toISOString()).toBe('2025-12-01T00:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(window.previousStart.toISOString()).toBe('2024-12-01T00:00:00.000Z');
    expect(window.buckets).toHaveLength(12);
    expect(window.granularity).toBe('month');
  });

  it('always provides eight trailing Monday-based weeks', () => {
    const window = resolveAnalyticsWindow('30d', new Date('2026-11-13T12:00:00Z'));

    expect(window.weeklyBuckets).toHaveLength(8);
    expect(window.weeklyStart.toISOString()).toBe('2026-09-21T00:00:00.000Z');
    expect(window.weeklyEnd.toISOString()).toBe('2026-11-16T00:00:00.000Z');
  });
});

describe('RestaurantAnalyticsService', () => {
  it('computes revenue, cost, profit and order counts from the aggregate facet', async () => {
    const { service } = serviceWith(facet());

    const result = await service.getForOwner(actor(), '30d');

    expect(result.summary).toMatchObject({
      revenue: 100,
      operationalCost: 42.3,
      netProfit: 57.7,
      totalOrders: 5,
      completedOrders: 2,
      cancelledOrders: 1,
      pendingOrders: 1,
      activeOrders: 1,
      averageOrderValue: 50,
      completionRatePercent: 40,
      cancellationRatePercent: 20,
      revenueGrowthPercent: 100,
      previousRevenue: 50,
    });
    expect(result.popularItems).toEqual([
      {
        productId: expect.any(String),
        name: 'Truffle Bowl',
        quantitySold: 5,
        revenue: 62.5,
      },
      {
        productId: expect.any(String),
        name: 'Citrus Salad',
        quantitySold: 2,
        revenue: 18,
      },
    ]);
    expect(result.orderDistribution).toEqual([
      { status: 'PENDING', count: 1 },
      { status: 'ACCEPTED', count: 1 },
      { status: 'COMPLETED', count: 2 },
      { status: 'CANCELLED', count: 1 },
    ]);
    expect(result.series).toHaveLength(30);
    expect(result.weeklySales).toHaveLength(8);
    expect(result.monthlySales).toHaveLength(12);
  });

  it('returns zeroed metrics for an empty data set', async () => {
    const { service } = serviceWith(facet({
      currentPlaced: [],
      previousPlaced: [],
      currentCompleted: [],
      previousCompleted: [],
      popularItems: [],
    }));

    const result = await service.getForOwner(actor(), '7d');

    expect(result.summary.revenue).toBe(0);
    expect(result.summary.totalOrders).toBe(0);
    expect(result.summary.averageOrderValue).toBe(0);
    expect(result.summary.completionRatePercent).toBe(0);
    expect(result.summary.revenueGrowthPercent).toBeNull();
    expect(result.popularItems).toEqual([]);
    expect(result.orderDistribution).toEqual([]);
    expect(result.series.every((point) => point.revenue === 0)).toBe(true);
  });

  it('scopes mine/analytics to the restaurant in the session', async () => {
    const { service, aggregate } = serviceWith(facet());
    await service.getForOwner(actor(), '7d');

    const [pipeline] = aggregate.mock.calls[0] as [Array<Record<string, unknown>>];
    const match = pipeline[0] as { $match: { restaurantId: Types.ObjectId } };
    expect(match.$match.restaurantId.toString()).toBe(RESTAURANT_ID);
  });

  it('rejects owners without a linked restaurant', async () => {
    const { service } = serviceWith(facet());
    await expect(
      service.getForOwner(actor({ restaurantId: undefined }), '7d'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks an owner from reading another restaurant analytics', async () => {
    const { service } = serviceWith(facet());
    await expect(
      service.getForActor(actor(), new Types.ObjectId().toString(), '7d'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an admin to read any restaurant analytics', async () => {
    const { service } = serviceWith(facet());
    const admin = actor({
      role: UserRole.ADMIN,
      restaurantId: undefined,
    });

    const result = await service.getForActor(admin, RESTAURANT_ID, '7d');
    expect(result.restaurantId).toBe(RESTAURANT_ID);
  });

  it('blocks customers and drivers from owner analytics', async () => {
    const { service } = serviceWith(facet());
    await expect(
      service.getForActor(actor({ role: UserRole.CUSTOMER }), RESTAURANT_ID, '7d'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.getForActor(actor({ role: UserRole.DRIVER }), RESTAURANT_ID, '7d'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
