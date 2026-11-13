import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VehicleType } from '../common/enums/user.enum';
import {
  VEHICLE_SPEED_KPH,
  haversineDistanceKm,
  type CoordinatesInput,
} from '../common/utils/geo.util';

export type RouteSource = 'osrm' | 'straight-line';

/** GeoJSON LineString in `[longitude, latitude]` order, as OSRM returns it. */
export interface RouteGeometry {
  type: 'LineString';
  coordinates: Array<[number, number]>;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  /** Ordered `{ lat, lng }` polyline for Leaflet-style renderers. */
  points: CoordinatesInput[];
  /**
   * Full road geometry from the routing provider. `null` when the labelled
   * straight-line fallback is used, so a client can never mistake an estimate
   * for a real road route.
   */
  geometry: RouteGeometry | null;
  source: RouteSource;
}

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    distance?: unknown;
    duration?: unknown;
    geometry?: { type?: unknown; coordinates?: unknown };
  }>;
}

/** Straight-line distances underestimate real driving. */
const ROAD_DETOUR_FACTOR = 1.35;
const CACHE_LIMIT = 500;

function cacheKey(profile: string, from: CoordinatesInput, to: CoordinatesInput): string {
  const round = (value: number) => value.toFixed(4);
  return `${profile}:${round(from.lat)},${round(from.lng)}->${round(to.lat)},${round(to.lng)}`;
}

/**
 * Normalises a raw OSRM GeoJSON line into `{ lat, lng }` points, rejecting
 * malformed coordinates instead of rendering a broken polyline.
 */
function parseGeometry(raw: unknown): {
  geometry: RouteGeometry | null;
  points: CoordinatesInput[];
} {
  if (!raw || typeof raw !== 'object') return { geometry: null, points: [] };

  const candidate = raw as { type?: unknown; coordinates?: unknown };
  if (candidate.type !== 'LineString' || !Array.isArray(candidate.coordinates)) {
    return { geometry: null, points: [] };
  }

  const coordinates: Array<[number, number]> = [];
  const points: CoordinatesInput[] = [];

  for (const entry of candidate.coordinates) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [lng, lat] = entry as [unknown, unknown];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    coordinates.push([lng, lat]);
    points.push({ lat, lng });
  }

  if (coordinates.length < 2) return { geometry: null, points: [] };
  return { geometry: { type: 'LineString', coordinates }, points };
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Road routing and travel-time provider.
 *
 * Uses an OSRM-compatible HTTP endpoint (OpenStreetMap's public server by
 * default) so distances are real road distances rather than straight lines.
 * Every call degrades to a clearly labelled estimate when the provider is
 * unreachable, disabled or returns a malformed payload, so assignment and
 * tracking keep working offline.
 *
 * Replace OSRM later by pointing `ROUTING_BASE_URL` at another
 * OSRM-compatible server, or by swapping this provider behind the
 * `RoutingService` interface.
 */
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly cache = new Map<string, { expiresAt: number; value: RouteResult }>();
  private readonly enabled: boolean;
  private readonly baseUrl: string;
  private readonly profile: string;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;

  constructor(config: ConfigService) {
    const provider = (config.get<string>('routing.provider') ?? 'osrm').toLowerCase();
    this.enabled = (config.get<boolean>('routing.enabled') ?? true) && provider === 'osrm';
    this.baseUrl = config.get<string>('routing.baseUrl') ?? '';
    this.profile = config.get<string>('routing.profile') ?? 'driving';
    this.timeoutMs = config.get<number>('routing.timeoutMs') ?? 4000;
    this.cacheTtlMs = config.get<number>('routing.cacheTtlMs') ?? 60_000;

    if (!this.enabled || !this.baseUrl) {
      this.logger.warn(
        'Road routing is disabled; distances and ETAs fall back to labelled estimates.',
      );
    }
  }

  get isLive(): boolean {
    return this.enabled && Boolean(this.baseUrl);
  }

  async getRoute(
    from: CoordinatesInput,
    to: CoordinatesInput,
    vehicle?: string,
  ): Promise<RouteResult> {
    const key = cacheKey(this.profile, from, to);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const fallback = this.estimateRoute(from, to, vehicle);

    if (!this.isLive) return fallback;

    try {
      const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`;
      const url = `${this.baseUrl}/route/v1/${this.profile}/${coordinates}?overview=full&geometries=geojson&alternatives=false&steps=false`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { accept: 'application/json' },
      });

      if (!response.ok) {
        this.logger.warn(`Routing provider returned ${response.status}; using estimate.`);
        return fallback;
      }

      const payload = (await response.json()) as OsrmRouteResponse;
      const route = payload?.routes?.[0];

      if (payload?.code !== 'Ok' || !route) {
        this.logger.warn('Routing provider returned no usable route; using estimate.');
        return fallback;
      }

      if (!isFiniteNonNegative(route.distance) || !isFiniteNonNegative(route.duration)) {
        this.logger.warn('Routing provider returned invalid distance/duration; using estimate.');
        return fallback;
      }

      const { geometry, points } = parseGeometry(route.geometry);
      if (!geometry) {
        this.logger.warn('Routing provider returned malformed geometry; using estimate.');
        return fallback;
      }

      const result: RouteResult = {
        distanceKm: Math.round((route.distance / 1000) * 100) / 100,
        // Seconds → minutes, rounded up so an ETA never promises an early arrival.
        durationMinutes: Math.max(1, Math.ceil(route.duration / 60)),
        points,
        geometry,
        source: 'osrm',
      };

      this.remember(key, result);
      return result;
    } catch (error) {
      this.logger.warn(
        `Routing provider unavailable (${(error as Error).message}); using estimate.`,
      );
      return fallback;
    }
  }

  /**
   * Travel time used by assignment ranking and the delivery ETA. The provider
   * returns a real driving duration; the fallback applies a road detour factor
   * to the straight-line distance so it is at least directionally honest.
   */
  async travelTime(
    from: CoordinatesInput,
    to: CoordinatesInput,
    vehicle?: string,
  ): Promise<{ minutes: number; distanceKm: number; source: RouteSource }> {
    const route = await this.getRoute(from, to, vehicle);
    return {
      minutes: route.durationMinutes,
      distanceKm: route.distanceKm,
      source: route.source,
    };
  }

  private estimateRoute(
    from: CoordinatesInput,
    to: CoordinatesInput,
    vehicle?: string,
  ): RouteResult {
    const straight = haversineDistanceKm(from, to);
    const distanceKm = Math.round(straight * ROAD_DETOUR_FACTOR * 100) / 100;
    const speed =
      VEHICLE_SPEED_KPH[vehicle as VehicleType] ?? VEHICLE_SPEED_KPH[VehicleType.SCOOTER];
    // Pure driving time. Callers add preparation/pickup buffers themselves so
    // the same allowance is never counted twice.
    const minutes = Math.max(1, Math.round((distanceKm / speed) * 60));
    return {
      distanceKm,
      durationMinutes: minutes,
      points: [from, to],
      geometry: null,
      source: 'straight-line',
    };
  }

  private remember(key: string, value: RouteResult): void {
    if (this.cache.size >= CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, value });
  }
}
