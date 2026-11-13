import type { Coordinates, Delivery, Driver, VehicleType } from '@/types';

/**
 * Automatic-assignment ranking.
 *
 * This module is deliberately pure: it does not read mock data or call a
 * service, so a backend, a unit test and the mock service can all use the same
 * ordering rules.
 *
 * Accuracy note: driver locations in this prototype are illustrative. When a
 * driver has no coordinates, or the restaurant address has no coordinates, the
 * ranking falls back to the coarse service-area match (borough level) and
 * recent-assignment fairness. It never invents a GPS distance.
 */

export const vehicleSpeedKph: Record<VehicleType, number> = {
  bike: 12,
  scooter: 18,
  car: 22,
};

/** Time to walk in, collect the food and mount the vehicle. */
export const pickupBufferMinutes = 4;

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Illustrative travel estimate derived from the great-circle distance and a
 * conservative average speed per vehicle. It is not live traffic routing.
 */
export function estimateTravelMinutes(distanceKm: number, vehicle: VehicleType): number {
  const speed = vehicleSpeedKph[vehicle] ?? vehicleSpeedKph.scooter;
  return Math.max(1, Math.round((distanceKm / speed) * 60 + pickupBufferMinutes));
}

/**
 * Reduce a human service-area label to its coarse zone. The demo uses labels
 * such as `Brooklyn · North`; the first segment is the borough. A production
 * system should replace this with explicit zone ids/polygons.
 */
export function normalizeServiceArea(value?: string | null): string | null {
  if (!value) return null;
  const [group] = value.split('·');
  const normalized = group?.trim().toLowerCase();
  return normalized ? normalized : null;
}

/**
 * Borough-level compatibility. Unknown values are treated as compatible so the
 * assignment system degrades to distance/fairness instead of silently
 * discarding every driver.
 */
export function serviceAreasCompatible(
  driverServiceArea?: string | null,
  restaurantServiceArea?: string | null,
): boolean {
  const driverZone = normalizeServiceArea(driverServiceArea);
  const restaurantZone = normalizeServiceArea(restaurantServiceArea);
  if (!driverZone || !restaurantZone) return true;
  // Mirror the API: "All boroughs" (and any area containing "all") is a wildcard.
  if (driverZone.includes('all') || restaurantZone.includes('all')) return true;
  return driverZone === restaurantZone;
}

export interface RankedDriverCandidate {
  driver: Driver;
  location: Coordinates | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  serviceAreaMatch: boolean;
  recentAssignmentCount: number;
  matchedBy: 'DISTANCE' | 'SERVICE_AREA';
  /** Debug text shown in admin dialogs; never used for authorization. */
  rationale: string;
}

export interface RankDriversInput {
  drivers: readonly Driver[];
  restaurantCoordinates?: Coordinates | null;
  restaurantServiceArea?: string | null;
  /** Look up the latest known position for a driver. */
  locationFor: (driverId: string) => Coordinates | null | undefined;
  /** How many previous assignment events each driver has. */
  recentAssignmentCounts?: Record<string, number>;
  excludeDriverIds?: readonly string[];
}

/**
 * Return every eligible driver, best candidate first.
 *
 * Eligibility (all required):
 * 1. approved account;
 * 2. AVAILABLE availability;
 * 3. no active delivery;
 * 4. compatible delivery service area;
 * 5. excluded ids are skipped (used after a manual unassign).
 *
 * Ranking: distance, then estimated travel time, then assignment fairness.
 */
export function rankEligibleDrivers({
  drivers,
  restaurantCoordinates,
  restaurantServiceArea,
  locationFor,
  recentAssignmentCounts = {},
  excludeDriverIds = [],
}: RankDriversInput): RankedDriverCandidate[] {
  const excluded = new Set(excludeDriverIds);

  const candidates = drivers
    .filter(
      (driver) =>
        !excluded.has(driver.id) &&
        driver.accountStatus === 'APPROVED' &&
        driver.availability === 'AVAILABLE' &&
        driver.activeDeliveryId === null &&
        serviceAreasCompatible(driver.serviceArea, restaurantServiceArea),
    )
    .map<RankedDriverCandidate>((driver) => {
      const location = locationFor(driver.id) ?? null;
      const hasDistance = Boolean(location && restaurantCoordinates);
      const distanceKm = hasDistance
        ? haversineDistanceKm(restaurantCoordinates as Coordinates, location as Coordinates)
        : null;
      const etaMinutes =
        distanceKm !== null ? estimateTravelMinutes(distanceKm, driver.vehicle) : null;

      return {
        driver,
        location,
        distanceKm,
        etaMinutes,
        serviceAreaMatch: serviceAreasCompatible(driver.serviceArea, restaurantServiceArea),
        recentAssignmentCount: recentAssignmentCounts[driver.id] ?? 0,
        matchedBy: distanceKm !== null ? 'DISTANCE' : 'SERVICE_AREA',
        rationale:
          distanceKm !== null
            ? `${distanceKm.toFixed(1)} km away · about ${etaMinutes} min`
            : `Matched by service area${driver.serviceArea ? ` (${driver.serviceArea})` : ''}`,
      };
    });

  return candidates.sort((a, b) => {
    // Drivers with a measurable distance always outrank those without.
    if (a.distanceKm !== null && b.distanceKm === null) return -1;
    if (a.distanceKm === null && b.distanceKm !== null) return 1;

    if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }

    if (a.etaMinutes !== null && b.etaMinutes !== null && a.etaMinutes !== b.etaMinutes) {
      return a.etaMinutes - b.etaMinutes;
    }

    if (a.recentAssignmentCount !== b.recentAssignmentCount) {
      return a.recentAssignmentCount - b.recentAssignmentCount;
    }

    return a.driver.name.localeCompare(b.driver.name);
  });
}

/** Best candidate, or null when no driver satisfies every rule. */
export function selectBestDriver(input: RankDriversInput): RankedDriverCandidate | null {
  return rankEligibleDrivers(input)[0] ?? null;
}

/** Fairness input: count prior assignment decisions per driver. */
export function countAssignmentsByDriver(deliveries: readonly Delivery[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const delivery of deliveries) {
    for (const event of delivery.assignmentHistory ?? []) {
      if (event.action === 'UNASSIGNED') continue;
      const driverId = event.newDriverId ?? event.driverId;
      if (!driverId) continue;
      counts[driverId] = (counts[driverId] ?? 0) + 1;
    }
  }

  return counts;
}
