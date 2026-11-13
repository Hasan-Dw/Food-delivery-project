import type { ConfigService } from '@nestjs/config';
import { RoutingService } from './routing.service';

function config(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function liveConfig(overrides: Record<string, unknown> = {}): ConfigService {
  return config({
    'routing.provider': 'osrm',
    'routing.enabled': true,
    'routing.baseUrl': 'https://router.example.test',
    'routing.profile': 'driving',
    'routing.timeoutMs': 1000,
    'routing.cacheTtlMs': 60_000,
    ...overrides,
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const RELAY = { lat: 40.7178, lng: -73.9573 };
const CUSTOMER = { lat: 40.7306, lng: -73.9867 };

const OSRM_OK = {
  code: 'Ok',
  routes: [
    {
      distance: 4200,
      duration: 900,
      geometry: {
        type: 'LineString',
        coordinates: [
          [-73.9573, 40.7178],
          [-73.97, 40.72],
          [-73.9867, 40.7306],
        ],
      },
    },
  ],
};

describe('RoutingService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('degrades to a labelled road-distance estimate when routing is disabled', async () => {
    const service = new RoutingService(
      config({
        'routing.enabled': false,
        'routing.baseUrl': '',
        'routing.timeoutMs': 100,
        'routing.cacheTtlMs': 1000,
      }),
    );

    const route = await service.getRoute(RELAY, CUSTOMER, 'scooter');

    expect(route.source).toBe('straight-line');
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.durationMinutes).toBeGreaterThanOrEqual(1);
    // The fallback is the two end points, so a map can still draw a line.
    expect(route.points).toEqual([RELAY, CUSTOMER]);
    // A straight-line estimate must never masquerade as road geometry.
    expect(route.geometry).toBeNull();
    expect(service.isLive).toBe(false);
  });

  it('respects a straight-line provider without attempting HTTP calls', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = new RoutingService(
      liveConfig({ 'routing.provider': 'straight-line' }),
    );

    const route = await service.getRoute(RELAY, CUSTOMER);
    expect(route.source).toBe('straight-line');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never returns a zero-minute estimate for a very short leg', async () => {
    const service = new RoutingService(
      config({
        'routing.enabled': false,
        'routing.baseUrl': '',
      }),
    );

    const route = await service.getRoute(RELAY, RELAY, 'bike');
    expect(route.distanceKm).toBe(0);
    expect(route.durationMinutes).toBe(1);
  });

  it('requests the configured driving profile with GeoJSON overview', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(OSRM_OK));

    const service = new RoutingService(liveConfig());
    await service.getRoute(RELAY, CUSTOMER, 'car');

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('/route/v1/driving/');
    expect(url).toContain('-73.9573,40.7178;-73.9867,40.7306');
    expect(url).toContain('overview=full');
    expect(url).toContain('geometries=geojson');
    expect(url).toContain('steps=false');
  });

  it('converts metres to kilometres and seconds to whole minutes', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({
        ...OSRM_OK,
        routes: [{ ...OSRM_OK.routes[0], distance: 8450, duration: 601 }],
      }),
    );

    const service = new RoutingService(liveConfig());
    const route = await service.getRoute(RELAY, CUSTOMER);

    expect(route.source).toBe('osrm');
    expect(route.distanceKm).toBeCloseTo(8.45, 2);
    // Rounded up: an ETA must not promise an early arrival.
    expect(route.durationMinutes).toBe(11);
  });

  it('returns the provider GeoJSON geometry and a matching lat/lng polyline', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(OSRM_OK));

    const service = new RoutingService(liveConfig());
    const route = await service.getRoute(RELAY, CUSTOMER);

    expect(route.geometry).toEqual({
      type: 'LineString',
      coordinates: OSRM_OK.routes[0].geometry.coordinates,
    });
    expect(route.points).toEqual([
      { lat: 40.7178, lng: -73.9573 },
      { lat: 40.72, lng: -73.97 },
      { lat: 40.7306, lng: -73.9867 },
    ]);
  });

  it('uses the provider result and caches repeated legs', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(OSRM_OK));

    const service = new RoutingService(liveConfig());

    const first = await service.getRoute(RELAY, CUSTOMER, 'car');
    expect(first).toMatchObject({
      source: 'osrm',
      distanceKm: 4.2,
      durationMinutes: 15,
    });
    expect(first.points).toHaveLength(3);

    const second = await service.getRoute(RELAY, CUSTOMER, 'car');
    expect(second).toEqual(first);
    // The second identical leg was served from the cache.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back when the provider times out', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(
        new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
      );

    const service = new RoutingService(liveConfig({ 'routing.timeoutMs': 50 }));
    const route = await service.getRoute(RELAY, CUSTOMER, 'scooter');

    expect(route.source).toBe('straight-line');
    expect(route.geometry).toBeNull();
    expect(route.distanceKm).toBeGreaterThan(0);
  });

  it('falls back when the provider is unreachable', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('connect ECONNREFUSED'));

    const service = new RoutingService(
      config({
        'routing.enabled': true,
        'routing.baseUrl': 'http://127.0.0.1:9',
        'routing.timeoutMs': 100,
      }),
    );

    const route = await service.getRoute(RELAY, CUSTOMER, 'scooter');
    expect(route.source).toBe('straight-line');
    expect(route.distanceKm).toBeGreaterThan(0);
  });

  it('falls back on an HTTP error response', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse({ code: 'InternalError' }, 500));

    const service = new RoutingService(liveConfig());
    expect((await service.getRoute(RELAY, CUSTOMER)).source).toBe(
      'straight-line',
    );
  });

  it('falls back when the provider answers with an error payload', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ code: 'NoRoute', routes: [] }),
    );

    const service = new RoutingService(liveConfig());
    expect((await service.getRoute(RELAY, CUSTOMER)).source).toBe(
      'straight-line',
    );
  });

  it('falls back when distance or duration are not finite numbers', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({
        code: 'Ok',
        routes: [
          {
            ...OSRM_OK.routes[0],
            distance: '4200',
            duration: Number.NaN,
          },
        ],
      }),
    );

    const service = new RoutingService(liveConfig());
    const route = await service.getRoute(RELAY, CUSTOMER);
    expect(route.source).toBe('straight-line');
    expect(route.distanceKm).toBeGreaterThan(0);
  });

  it('falls back when the GeoJSON geometry is malformed', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({
        code: 'Ok',
        routes: [
          {
            distance: 4200,
            duration: 900,
            geometry: {
              type: 'Polygon',
              coordinates: [
                ['x', 'y'],
                [200, 95],
              ],
            },
          },
        ],
      }),
    );

    const service = new RoutingService(liveConfig());
    const route = await service.getRoute(RELAY, CUSTOMER);

    expect(route.source).toBe('straight-line');
    expect(route.geometry).toBeNull();
    expect(route.points).toEqual([RELAY, CUSTOMER]);
  });

  it('falls back when the response body is not JSON', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('not-json', { status: 200 }));

    const service = new RoutingService(liveConfig());
    expect((await service.getRoute(RELAY, CUSTOMER)).source).toBe(
      'straight-line',
    );
  });

  it('exposes travel time from the same route response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(OSRM_OK));

    const service = new RoutingService(liveConfig());
    const travel = await service.travelTime(RELAY, CUSTOMER, 'car');

    expect(travel).toEqual({ minutes: 15, distanceKm: 4.2, source: 'osrm' });
  });
});
