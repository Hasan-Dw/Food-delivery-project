/**
 * Savora currently operates in one city. Discovery, menu browsing and ratings
 * are scoped to this service area so a restaurant in another city can never
 * leak into the customer catalog even if its record is approved.
 */
export const SERVICE_AREA_CITY = 'Latakia';

/** Case-insensitive exact match for the service-area city. */
export const SERVICE_AREA_CITY_FILTER = /^latakia$/i;

export const SERVICE_AREA_BOUNDS = {
  minLat: 35.42,
  maxLat: 35.62,
  minLng: 35.68,
  maxLng: 35.88,
} as const;

/** True when a coordinate is inside the supported Latakia service area. */
export function isInsideServiceArea(point?: { lat?: number; lng?: number } | null): boolean {
  if (!point) return false;
  const { lat, lng } = point;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  return (
    lat >= SERVICE_AREA_BOUNDS.minLat &&
    lat <= SERVICE_AREA_BOUNDS.maxLat &&
    lng >= SERVICE_AREA_BOUNDS.minLng &&
    lng <= SERVICE_AREA_BOUNDS.maxLng
  );
}
