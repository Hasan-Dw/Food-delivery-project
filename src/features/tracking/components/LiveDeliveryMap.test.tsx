import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TrackingSnapshot } from '@/types';

vi.mock('react-leaflet', async () => {
  const React = await import('react');
  interface ChildrenProps {
    children?: ReactNode;
  }

  return {
    MapContainer: ({ children }: ChildrenProps) =>
      React.createElement('div', { 'data-testid': 'map' }, children),
    TileLayer: () => null,
    Marker: ({ children }: ChildrenProps) =>
      React.createElement('div', { 'data-testid': 'marker' }, children),
    Popup: ({ children }: ChildrenProps) =>
      React.createElement('div', null, children),
    Polyline: ({
      positions,
      pathOptions,
    }: {
      positions: Array<[number, number]>;
      pathOptions?: { dashArray?: string };
    }) =>
      React.createElement('div', {
        'data-testid': 'polyline',
        'data-points': JSON.stringify(positions),
        'data-dash': pathOptions?.dashArray ?? '',
      }),
    useMap: () => ({ setView: () => undefined, fitBounds: () => undefined }),
  };
});

import { LiveDeliveryMap } from './LiveDeliveryMap';

function snapshot(overrides: Partial<TrackingSnapshot> = {}): TrackingSnapshot {
  return {
    orderId: 'order-1',
    orderStatus: 'READY',
    deliveryStatus: 'ON_THE_WAY',
    driverLocation: null,
    etaMinutes: 12,
    destination: {
      label: 'Home',
      address: '1 Test Street',
      coordinates: { lat: 40.73, lng: -73.98 },
    },
    restaurant: {
      label: 'Test Kitchen',
      address: '2 Test Street',
      coordinates: { lat: 40.71, lng: -73.96 },
    },
    route: {
      points: [
        { lat: 40.71, lng: -73.96 },
        { lat: 40.73, lng: -73.98 },
      ],
      distanceKm: 2.4,
      source: 'osrm',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-73.96, 40.71],
          [-73.965, 40.715],
          [-73.98, 40.73],
        ],
      },
    },
    remainingDistanceKm: 2.4,
    etaSource: 'osrm',
    progress: 0.75,
    lastUpdated: '2026-11-13T00:00:00.000Z',
    live: true,
    ...overrides,
  };
}

describe('LiveDeliveryMap', () => {
  it('renders the road GeoJSON geometry instead of the two-point fallback', () => {
    render(<LiveDeliveryMap snapshot={snapshot()} />);

    // The component draws a wide casing line plus the visible route line.
    const polyline = screen.getAllByTestId('polyline').at(-1)!;
    // GeoJSON is [lng, lat]; Leaflet needs [lat, lng].
    expect(JSON.parse(polyline.getAttribute('data-points') as string)).toEqual([
      [40.71, -73.96],
      [40.715, -73.965],
      [40.73, -73.98],
    ]);
    expect(polyline.getAttribute('data-dash')).toBe('');
    expect(screen.getByText('Road route')).toBeTruthy();
  });

  it('labels and dashes the straight-line fallback when no road geometry exists', () => {
    const fallback = snapshot({
      route: {
        points: [
          { lat: 40.71, lng: -73.96 },
          { lat: 40.73, lng: -73.98 },
        ],
        distanceKm: 2.4,
        source: 'straight-line',
        geometry: null,
      },
      etaSource: 'straight-line',
    });

    render(<LiveDeliveryMap snapshot={fallback} />);

    const polyline = screen.getAllByTestId('polyline').at(-1)!;
    expect(JSON.parse(polyline.getAttribute('data-points') as string)).toEqual([
      [40.71, -73.96],
      [40.73, -73.98],
    ]);
    expect(polyline.getAttribute('data-dash')).toBe('9 9');
    expect(screen.getByText('Estimated straight-line route')).toBeTruthy();
    expect(
      screen.getByText(/labelled straight-line estimate/i),
    ).toBeTruthy();
  });

  it('ignores malformed geometry and keeps the fallback line drawable', () => {
    const malformed = snapshot({
      route: {
        points: [
          { lat: 40.71, lng: -73.96 },
          { lat: 40.73, lng: -73.98 },
        ],
        distanceKm: 2.4,
        source: 'osrm',
        geometry: {
          type: 'LineString',
          coordinates: [[-73.96, 40.71]],
        },
      },
    });

    render(<LiveDeliveryMap snapshot={malformed} />);

    const polyline = screen.getAllByTestId('polyline').at(-1)!;
    expect(JSON.parse(polyline.getAttribute('data-points') as string)).toEqual([
      [40.71, -73.96],
      [40.73, -73.98],
    ]);
    expect(polyline.getAttribute('data-dash')).toBe('9 9');
  });

  it('keeps restaurant, destination and driver markers on the road route', () => {
    render(
      <LiveDeliveryMap
        snapshot={snapshot({
          driverLocation: {
            driverId: 'driver-1',
            lat: 40.715,
            lng: -73.965,
            updatedAt: '2026-11-13T00:00:00.000Z',
          },
        })}
      />,
    );

    expect(screen.getAllByTestId('marker')).toHaveLength(3);
    expect(screen.getByText('Test Kitchen')).toBeTruthy();
    expect(screen.getByText('1 Test Street')).toBeTruthy();
  });
});
