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

/** Used when an order has no explicit preparation record yet. */
export const DEFAULT_PREP_MINUTES = 15;

/** Doorstep handover allowance after the driver reaches the customer. */
export const HANDOVER_BUFFER_MINUTES = 3;

const EARTH_RADIUS_KM = 6371;

export interface CoordinatesInput {
  lat: number;
  lng: number;
}

export type ServiceAreaGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

function pointInRing(point: CoordinatesInput, ring: number[][]): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [longitude, latitude] = ring[index] ?? [];
    const [previousLongitude, previousLatitude] = ring[previous] ?? [];
    if (
      (latitude > point.lat) !== (previousLatitude > point.lat) &&
      point.lng <
        ((previousLongitude - longitude) * (point.lat - latitude)) /
          (previousLatitude - latitude) +
          longitude
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(point: CoordinatesInput, polygon: number[][][]): boolean {
  const [outerRing, ...holes] = polygon;
  return Boolean(
    outerRing &&
      pointInRing(point, outerRing) &&
      !holes.some((hole) => pointInRing(point, hole)),
  );
}

/** Checks a restaurant/pickup point against an admin-defined GeoJSON boundary. */
export function isInsideServiceAreaGeometry(
  point: CoordinatesInput,
  geometry?: ServiceAreaGeometry | null,
): boolean {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') return pointInPolygon(point, geometry.coordinates);
  return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
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

/** City zones that contain every neighbourhood we seed as a driver area. */
const LATAKIA_ZONES = new Set(['latakia']);

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
  // Restaurants store the city while drivers are grouped by Latakia
  // neighbourhood, so a city-level match covers every neighbourhood in it.
  if (LATAKIA_ZONES.has(driverZone) || LATAKIA_ZONES.has(restaurantZone)) {
    return true;
  }
  return driverZone === restaurantZone;
}
