import type { Coordinates, Delivery, Driver, VehicleType } from '@/types';

/**
 * Automatic-assignment ranking.
 *
 * This module is deliberately pure: it does not read mock data or call a
 * service, so a backend, a unit test and the mock service can all use the same
 * ordering rules.
 *
 * Drivers without a current valid GPS location are excluded. Assignment must
 * never infer a nearest driver from legacy service-area data.
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

/** Legacy compatibility helper. Service-area data is never an eligibility rule. */
export function serviceAreasCompatible(
  _driverServiceArea?: string | null,
  _restaurantServiceArea?: string | null,
): boolean {
  return true;
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
 * 4. excluded ids are skipped (used after a manual unassign).
 *
 * Ranking: distance, then estimated travel time, then assignment fairness.
 */
export function rankEligibleDrivers({
  drivers,
  restaurantCoordinates,
  locationFor,
  recentAssignmentCounts = {},
  excludeDriverIds = [],
}: RankDriversInput): RankedDriverCandidate[] {
  const excluded = new Set(excludeDriverIds);
  const isValidLocation = (location: Coordinates | null | undefined): location is Coordinates =>
    Boolean(
      location &&
        Number.isFinite(location.lat) &&
        Number.isFinite(location.lng) &&
        location.lat >= -90 &&
        location.lat <= 90 &&
        location.lng >= -180 &&
        location.lng <= 180,
    );

  const candidates = drivers
    .filter((driver) => {
      const location = locationFor(driver.id);
      return (
        !excluded.has(driver.id) &&
        driver.accountStatus === 'APPROVED' &&
        driver.availability === 'AVAILABLE' &&
        driver.activeDeliveryId === null &&
        Boolean(restaurantCoordinates) &&
        isValidLocation(location)
      );
    })
    .map<RankedDriverCandidate>((driver) => {
      const location = locationFor(driver.id) as Coordinates;
      const distanceKm = haversineDistanceKm(restaurantCoordinates as Coordinates, location);
      const etaMinutes =
        distanceKm !== null ? estimateTravelMinutes(distanceKm, driver.vehicle) : null;

      return {
        driver,
        location,
        distanceKm,
        etaMinutes,
        serviceAreaMatch: true,
        recentAssignmentCount: recentAssignmentCounts[driver.id] ?? 0,
        matchedBy: distanceKm !== null ? 'DISTANCE' : 'SERVICE_AREA',
        rationale:
          distanceKm !== null
            ? `${distanceKm.toFixed(1)} km away · about ${etaMinutes} min`
            : 'No measurable distance available.',
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
