import { isInsideServiceAreaGeometry } from './geo.util';

describe('isInsideServiceAreaGeometry', () => {
  const polygon = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [35.7, 35.5],
        [35.8, 35.5],
        [35.8, 35.6],
        [35.7, 35.6],
        [35.7, 35.5],
      ],
    ],
  };

  it('accepts a point inside a GeoJSON polygon', () => {
    expect(isInsideServiceAreaGeometry({ lat: 35.55, lng: 35.75 }, polygon)).toBe(true);
  });

  it('rejects a point outside the polygon', () => {
    expect(isInsideServiceAreaGeometry({ lat: 35.65, lng: 35.75 }, polygon)).toBe(false);
  });

  it('rejects a point inside a polygon hole', () => {
    expect(
      isInsideServiceAreaGeometry(
        { lat: 35.55, lng: 35.75 },
        {
          ...polygon,
          coordinates: [
            polygon.coordinates[0]!,
            [
              [35.73, 35.53],
              [35.77, 35.53],
              [35.77, 35.57],
              [35.73, 35.57],
              [35.73, 35.53],
            ],
          ],
        },
      ),
    ).toBe(false);
  });
});
