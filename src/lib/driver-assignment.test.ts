import { describe, expect, it } from 'vitest';
import type { Coordinates, Driver } from '@/types';
import { rankEligibleDrivers } from './driver-assignment';

const restaurant: Coordinates = { lat: 35.515, lng: 35.79 };

function driver(id: string, overrides: Partial<Driver> = {}): Driver {
  return {
    id,
    userId: `${id}-user`,
    name: id,
    avatarKey: 'avatar-driver',
    vehicle: 'scooter',
    rating: 5,
    completedDeliveries: 0,
    totalEarnings: 0,
    phone: '',
    accountStatus: 'APPROVED',
    availability: 'AVAILABLE',
    activeDeliveryId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function rank(
  drivers: Driver[],
  locations: Record<string, Coordinates | null>,
) {
  return rankEligibleDrivers({
    drivers,
    restaurantCoordinates: restaurant,
    restaurantServiceArea: 'Al-Raml Al-Janoubi',
    locationFor: (id) => locations[id],
  });
}

describe('rankEligibleDrivers', () => {
  it('assigns across neighborhoods without consulting service area', () => {
    const candidates = rank(
      [driver('distant', { serviceArea: 'Daatour' })],
      { distant: { lat: 35.548, lng: 35.785 } },
    );

    expect(candidates.map(({ driver: value }) => value.id)).toEqual(['distant']);
  });

  it('selects the nearest available driver and skips busy drivers', () => {
    const candidates = rank(
      [
        driver('busy-nearest', {
          activeDeliveryId: 'existing-delivery',
          serviceArea: 'Al-Ziraa',
        }),
        driver('near', { serviceArea: 'Sheikh Daher' }),
        driver('far', { serviceArea: 'Daatour' }),
      ],
      {
        'busy-nearest': { lat: 35.515, lng: 35.79 },
        near: { lat: 35.516, lng: 35.79 },
        far: { lat: 35.548, lng: 35.785 },
      },
    );

    expect(candidates.map(({ driver: value }) => value.id)).toEqual(['near', 'far']);
  });

  it('does not select a driver without valid GPS coordinates', () => {
    const candidates = rank(
      [
        driver('missing'),
        driver('invalid'),
        driver('valid'),
      ],
      {
        missing: null,
        invalid: { lat: 999, lng: 35.79 },
        valid: { lat: 35.516, lng: 35.79 },
      },
    );

    expect(candidates.map(({ driver: value }) => value.id)).toEqual(['valid']);
  });
});
