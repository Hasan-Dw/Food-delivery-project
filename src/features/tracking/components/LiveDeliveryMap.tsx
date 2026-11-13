import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Navigation2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatEta } from '@/lib/format';
import type { Coordinates, TrackingSnapshot } from '@/types';

const palette = {
  olive: '#354638',
  terracotta: '#C65D3B',
  cream: '#FBF8F1',
  gold: '#D6AA70',
};

function pinIcon(color: string, glyph: string) {
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:${color};color:${palette.cream};border:3px solid ${palette.cream};box-shadow:0 4px 12px rgba(53,70,56,0.28);font-size:13px;line-height:1;">${glyph}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const icons = {
  restaurant: pinIcon(palette.olive, '🍽'),
  driver: pinIcon(palette.terracotta, '➤'),
  destination: pinIcon(palette.olive, '⌂'),
};

/** Keeps every route point visible as the driver moves or the route changes. */
function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);

  return null;
}

function toLatLng(point: Coordinates): [number, number] {
  return [point.lat, point.lng];
}

interface LiveDeliveryMapProps {
  snapshot: TrackingSnapshot;
}

/**
 * Real map for a delivery route. Tiles come from OpenStreetMap and the polyline
 * is the routed geometry returned by the API (OSRM), not a static image.
 */
export function LiveDeliveryMap({ snapshot }: LiveDeliveryMapProps) {
  const roadGeometry = useMemo(() => {
    const coordinates = snapshot.route.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) return null;
    const points = coordinates
      .filter(
        (coordinate): coordinate is [number, number] =>
          Array.isArray(coordinate) &&
          coordinate.length >= 2 &&
          Number.isFinite(coordinate[0]) &&
          Number.isFinite(coordinate[1]),
      )
      .map(([lng, lat]) => [lat, lng] as [number, number]);
    return points.length >= 2 ? points : null;
  }, [snapshot.route.geometry]);

  const route = useMemo(
    () => roadGeometry ?? snapshot.route.points.map(toLatLng),
    [roadGeometry, snapshot.route.points],
  );

  const driverPoint = snapshot.driverLocation
    ? toLatLng(snapshot.driverLocation)
    : null;
  const restaurantPoint = toLatLng(snapshot.restaurant.coordinates);
  const destinationPoint = toLatLng(snapshot.destination.coordinates);
  const center = driverPoint ?? restaurantPoint ?? destinationPoint;
  const source = snapshot.etaSource ?? snapshot.route.source;
  const distance = snapshot.remainingDistanceKm ?? snapshot.route.distanceKm;
  const isRoadRoute = Boolean(roadGeometry) && source === 'osrm';

  return (
    <section
      aria-labelledby="live-map-heading"
      className="overflow-hidden rounded-panel border border-olive-900/10 bg-cream shadow-[0_1px_0_rgba(73,56,46,0.03)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-olive-900/8 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="gold">Live map</Badge>
          <span id="live-map-heading" className="text-[0.75rem] font-medium text-olive-600">
            {isRoadRoute ? 'Road route' : 'Estimated straight-line route'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[0.6875rem] text-olive-500">
          <span className="inline-flex items-center gap-1.5">
            <Navigation2 aria-hidden="true" className="h-3.5 w-3.5 text-terracotta" />
            {distance.toFixed(1)} km left
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-olive-700">
            <Compass aria-hidden="true" className="h-3.5 w-3.5 text-olive-500" />
            {formatEta(snapshot.etaMinutes)}
          </span>
        </div>
      </div>

      <div className="relative h-[340px] w-full sm:h-[380px]">
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitRoute points={route} />

          {route.length > 1 ? (
            <>
              <Polyline positions={route} pathOptions={{ color: palette.cream, weight: 12, opacity: 0.9 }} />
              <Polyline
                positions={route}
                pathOptions={{
                  color: palette.terracotta,
                  weight: 5,
                  opacity: 0.9,
                  dashArray: isRoadRoute ? undefined : '9 9',
                }}
              />
            </>
          ) : null}

          <Marker position={restaurantPoint} icon={icons.restaurant}>
            <Popup>{snapshot.restaurant.label}</Popup>
          </Marker>
          <Marker position={destinationPoint} icon={icons.destination}>
            <Popup>{snapshot.destination.address || snapshot.destination.label}</Popup>
          </Marker>
          {driverPoint ? (
            <Marker position={driverPoint} icon={icons.driver}>
              <Popup>
                {snapshot.driver?.name ?? 'Driver'}
                {snapshot.etaMinutes != null ? ` · ${formatEta(snapshot.etaMinutes)}` : ''}
              </Popup>
            </Marker>
          ) : null}
        </MapContainer>
      </div>

      <div className="flex flex-col gap-2 border-t border-olive-900/8 bg-ivory px-5 py-3 text-[0.6875rem] leading-relaxed text-olive-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {isRoadRoute
            ? 'Route, distance and ETA are computed by the Savora API from the latest driver position using real road routing.'
            : 'Road routing is unavailable, so this is a labelled straight-line estimate — not an actual road distance.'}
        </p>
        <span className="shrink-0 uppercase tracking-[0.12em] text-olive-500">
          {snapshot.live ? 'Live updates' : 'Snapshot'}
        </span>
      </div>
    </section>
  );
}
