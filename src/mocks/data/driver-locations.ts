import type { DriverLocation } from '@/types';

/**
 * Latest known driver positions. These are illustrative mock coordinates in
 * the same shape a GPS feed will publish; no browser location permission is
 * requested and nothing updates on a timer.
 */
export const driverLocations: DriverLocation[] = [
  {
    driverId: 'drv_daniel',
    deliveryId: 'dlv_10482',
    lat: 40.7041,
    lng: -73.9718,
    heading: 208,
    speedKph: 18,
    updatedAt: new Date(Date.now() - 45_000).toISOString(),
  },
  {
    driverId: 'drv_luis',
    lat: 40.7128,
    lng: -73.9566,
    heading: 90,
    speedKph: 0,
    updatedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
  },
];

export function findDriverLocation(driverId: string): DriverLocation | undefined {
  return driverLocations.find((location) => location.driverId === driverId);
}

export function upsertDriverLocation(location: DriverLocation): DriverLocation {
  const index = driverLocations.findIndex((entry) => entry.driverId === location.driverId);
  if (index >= 0) {
    driverLocations[index] = location;
  } else {
    driverLocations.push(location);
  }
  return location;
}
