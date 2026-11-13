import type { Coordinates } from '@/types';

export interface GeocodedAddressParts {
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface GeocodedPlace {
  displayName: string;
  coordinates: Coordinates;
  address?: GeocodedAddressParts;
}

export interface GeocodingProvider {
  search(query: string, options?: { signal?: AbortSignal }): Promise<GeocodedPlace[]>;
  reverse(
    coordinates: Coordinates,
    options?: { signal?: AbortSignal },
  ): Promise<GeocodedPlace | null>;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface NominatimPlace {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
}

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org';
const MIN_REQUEST_INTERVAL_MS = 1100;

// Nominatim's usage policy allows at most one request per second. Requests are
// serialised through this small client-side gate in addition to input debounce.
let nextAllowedRequestAt = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextAllowedRequestAt - now);
  nextAllowedRequestAt = Math.max(now, nextAllowedRequestAt) + MIN_REQUEST_INTERVAL_MS;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

function toCoordinates(place: NominatimPlace): Coordinates | null {
  const lat = Number(place.lat);
  const lng = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function toAddress(place: NominatimPlace): GeocodedAddressParts {
  const address = place.address ?? {};
  const street = address.road || address.pedestrian || address.footway;
  const line1 = [address.house_number, street].filter(Boolean).join(' ').trim();

  return {
    line1: line1 || street || undefined,
    city: address.city || address.town || address.village || address.suburb || undefined,
    state: address.state || undefined,
    postalCode: address.postcode || undefined,
    country: address.country || undefined,
  };
}

function toPlace(place: NominatimPlace): GeocodedPlace | null {
  const coordinates = toCoordinates(place);
  if (!coordinates) return null;

  return {
    displayName: place.display_name?.trim() || `${coordinates.lat}, ${coordinates.lng}`,
    coordinates,
    address: toAddress(place),
  };
}

/**
 * Public OpenStreetMap geocoder. It needs no API key and degrades gracefully:
 * map selection and manual address entry work even when search is unavailable.
 */
export const nominatimGeocoder: GeocodingProvider = {
  async search(query, options = {}) {
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];

    await throttle();
    if (options.signal?.aborted) return [];

    const params = new URLSearchParams({
      q: trimmed,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      'accept-language': 'en',
    });

    const response = await fetch(`${NOMINATIM_ENDPOINT}/search?${params.toString()}`, {
      signal: options.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Address search is temporarily unavailable.');
    }

    const payload = (await response.json()) as NominatimPlace[];
    return payload.map(toPlace).filter((place): place is GeocodedPlace => Boolean(place));
  },

  async reverse(coordinates, options = {}) {
    await throttle();
    if (options.signal?.aborted) return null;

    const params = new URLSearchParams({
      lat: String(coordinates.lat),
      lon: String(coordinates.lng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
      'accept-language': 'en',
    });

    const response = await fetch(`${NOMINATIM_ENDPOINT}/reverse?${params.toString()}`, {
      signal: options.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error('The address for this point could not be resolved.');
    }

    const payload = (await response.json()) as NominatimPlace;
    return toPlace(payload);
  },
};
