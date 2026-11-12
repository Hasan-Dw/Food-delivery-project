import { VehicleType } from '../enums/user.enum';

/**
 * Illustrative distance and ETA helpers shared by assignment and tracking.
 * These are deliberately simple: no routing provider is integrated in Phase 2.
 */

export const VEHICLE_SPEED_KPH: Record<VehicleType, number> = {
  [VehicleType.BIKE]: 12,
  [VehicleType.SCOOTER]: 18,
  [VehicleType.CAR]: 22,
};

export const PICKUP_BUFFER_MINUTES = 4;

const EARTH_RADIUS_KM = 6371;

export interface CoordinatesInput {
  lat: number;
  lng: number;
}

export function haversineDistanceKm(a: CoordinatesInput, b: CoordinatesInput): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function estimateTravelMinutes(distanceKm: number, vehicle: string): number {
  const speed =
    VEHICLE_SPEED_KPH[vehicle as VehicleType] ?? VEHICLE_SPEED_KPH[VehicleType.SCOOTER];
  return Math.max(1, Math.round((distanceKm / speed) * 60 + PICKUP_BUFFER_MINUTES));
}

/** Coarse zone used for the service-area compatibility check. */
export function normalizeServiceArea(value?: string | null): string | null {
  if (!value) return null;
  const [group] = value.split('·');
  const normalized = group?.trim().toLowerCase();
  return normalized ? normalized : null;
}

/**
 * Unknown values are treated as compatible so assignment degrades to distance
 * and fairness instead of rejecting every driver.
 */
export function serviceAreasCompatible(
  driverServiceArea?: string | null,
  restaurantArea?: string | null,
): boolean {
  const driverZone = normalizeServiceArea(driverServiceArea);
  const restaurantZone = normalizeServiceArea(restaurantArea);
  if (!driverZone || !restaurantZone) return true;
  if (driverZone.includes('all') || restaurantZone.includes('all')) return true;
  return driverZone === restaurantZone;
}
