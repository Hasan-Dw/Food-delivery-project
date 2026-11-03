import { Compass, Info, Navigation2 } from 'lucide-react';
import type { Coordinates, TrackingSnapshot } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { formatEta } from '@/lib/format';

const MAP_WIDTH = 880;
const MAP_HEIGHT = 560;
const MAP_PADDING = 58;

const palette = {
  ground: '#E9E2D4',
  block: '#F6F1E7',
  blockEdge: '#DED3C0',
  roadLine: '#D8CBB6',
  park: '#DDE4D4',
  parkEdge: '#C9D4C0',
  olive: '#354638',
  oliveLight: '#87917B',
  terracotta: '#C65D3B',
  cream: '#FBF8F1',
  gold: '#D6AA70',
};

interface ProjectedPoint extends Coordinates {
  x: number;
  y: number;
}

function project(points: Coordinates[]): ProjectedPoint[] {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;
  const innerWidth = MAP_WIDTH - MAP_PADDING * 2;
  const innerHeight = MAP_HEIGHT - MAP_PADDING * 2;

  return points.map((point) => ({
    ...point,
    x: MAP_PADDING + ((point.lng - minLng) / lngSpan) * innerWidth,
    y: MAP_PADDING + ((maxLat - point.lat) / latSpan) * innerHeight,
  }));
}

function positionAlong(points: ProjectedPoint[], progress: number): ProjectedPoint {
  if (points.length === 0) return { lat: 0, lng: 0, x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
  if (points.length === 1) return points[0];

  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    return Math.hypot(point.x - previous.x, point.y - previous.y);
  });
  const total = segments.reduce((sum, length) => sum + length, 0);
  let remaining = Math.min(Math.max(progress, 0), 1) * total;

  for (let index = 0; index < segments.length; index += 1) {
    if (remaining <= segments[index]) {
      const start = points[index];
      const end = points[index + 1];
      const ratio = segments[index] === 0 ? 0 : remaining / segments[index];
      return {
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio,
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    remaining -= segments[index];
  }

  return points[points.length - 1];
}

function labelWidth(text: string): number {
  return text.length * 6.6 + 22;
}

/**
 * Hand-drawn demo map.
 *
 * It is intentionally not a map-provider component: no tiles, no GPS, no
 * location permission. The route is projected from the same coordinates a real
 * provider would use, so replacing this component is a contained change.
 */
export function DeliveryMap({ snapshot }: { snapshot: TrackingSnapshot }) {
  const points = project(snapshot.route.points);
  const restaurant = points[0];
  const home = points[points.length - 1];
  const driver = positionAlong(points, snapshot.progress);
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  const progressDash = `${Math.round(snapshot.progress * 100)} ${Math.round(100 - snapshot.progress * 100)}`;

  const driverLabel = snapshot.driver ? `${snapshot.driver.name.split(' ')[0]} · ${formatEta(snapshot.etaMinutes)}` : 'Driver';
  const restaurantLabel = snapshot.restaurant.label;
  const homeLabel = snapshot.destination.label;

  return (
    <section
      aria-labelledby="map-heading"
      className="overflow-hidden rounded-panel border border-olive-900/10 bg-cream shadow-[0_1px_0_rgba(73,56,46,0.03)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-olive-900/8 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="gold">Demo map</Badge>
          <span id="map-heading" className="text-[0.75rem] font-medium text-olive-600">
            Illustrative route · not live GPS
          </span>
        </div>
        <div className="flex items-center gap-4 text-[0.6875rem] text-olive-500">
          <span className="inline-flex items-center gap-1.5">
            <Navigation2 aria-hidden="true" className="h-3.5 w-3.5 text-terracotta" />
            {snapshot.route.distanceKm.toFixed(1)} km
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-olive-700">
            <Compass aria-hidden="true" className="h-3.5 w-3.5 text-olive-500" />
            {formatEta(snapshot.etaMinutes)}
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Demo map. Route from ${restaurantLabel} to ${homeLabel}, about ${snapshot.route.distanceKm.toFixed(1)} kilometres. The driver is roughly ${Math.round(snapshot.progress * 100)} percent of the way along the route.`}
        >
          <title>Illustrative delivery route</title>
          <desc>
            A hand-drawn map showing {restaurantLabel} at the start of the route, a driver moving along the route, and{' '}
            {homeLabel} at the destination. This is demo data, not live GPS.
          </desc>

          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill={palette.ground} />

          {/* City blocks */}
          <g fill={palette.block} stroke={palette.blockEdge} strokeWidth="1">
            <rect x="18" y="18" width="142" height="98" rx="9" />
            <rect x="200" y="18" width="172" height="98" rx="9" />
            <rect x="412" y="18" width="168" height="98" rx="9" />
            <rect x="620" y="18" width="150" height="98" rx="9" />
            <rect x="810" y="18" width="60" height="98" rx="9" />

            <rect x="18" y="160" width="110" height="130" rx="9" />
            <rect x="168" y="160" width="204" height="130" rx="9" />
            <rect x="412" y="160" width="168" height="130" rx="9" />
            <rect x="620" y="160" width="150" height="130" rx="9" />

            <rect x="18" y="334" width="110" height="108" rx="9" />
            <rect x="168" y="334" width="204" height="108" rx="9" />
            <rect x="412" y="334" width="168" height="108" rx="9" />
            <rect x="620" y="334" width="150" height="108" rx="9" />

            <rect x="18" y="486" width="110" height="54" rx="9" />
            <rect x="168" y="486" width="204" height="54" rx="9" />
            <rect x="412" y="486" width="168" height="54" rx="9" />
          </g>

          {/* Park */}
          <path
            d="M 640 366 C 690 354 764 360 836 380 C 858 392 858 474 830 512 C 786 542 704 538 654 514 C 626 500 620 414 640 366 Z"
            fill={palette.park}
            stroke={palette.parkEdge}
            strokeWidth="1.5"
          />
          <g fill={palette.parkEdge} opacity="0.8">
            <circle cx="686" cy="414" r="9" />
            <circle cx="724" cy="452" r="12" />
            <circle cx="786" cy="408" r="8" />
            <circle cx="790" cy="472" r="11" />
          </g>
          <text
            x="736"
            y="486"
            textAnchor="middle"
            fill="#7A8B70"
            fontSize="10"
            fontWeight="600"
            letterSpacing="2"
            fontFamily="Inter, sans-serif"
          >
            FORT GREENE PARK
          </text>

          {/* Road centrelines */}
          <g stroke={palette.roadLine} strokeWidth="1" strokeDasharray="6 7" opacity="0.85">
            <line x1="0" y1="140" x2="880" y2="140" />
            <line x1="0" y1="314" x2="880" y2="314" />
            <line x1="0" y1="466" x2="880" y2="466" />
            <line x1="152" y1="0" x2="152" y2="560" />
            <line x1="396" y1="0" x2="396" y2="560" />
            <line x1="604" y1="0" x2="604" y2="560" />
            <line x1="794" y1="0" x2="794" y2="560" />
          </g>

          {/* Street labels */}
          <g fill="#A99C87" fontSize="9" fontWeight="600" letterSpacing="2.2" fontFamily="Inter, sans-serif">
            <text x="232" y="134">SOUTH 4TH ST</text>
            <text x="444" y="308">GRAND ST</text>
            <text x="184" y="460">METROPOLITAN AVE</text>
            <text x="166" y="238" transform="rotate(-90 166 238)">
              WYTHE AVE
            </text>
            <text x="410" y="510" transform="rotate(-90 410 510)">
              BEDFORD AVE
            </text>
          </g>

          {/* Route */}
          <polyline
            points={polyline}
            fill="none"
            stroke={palette.cream}
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
          <polyline
            points={polyline}
            fill="none"
            stroke={palette.olive}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.18"
          />
          <polyline
            points={polyline}
            fill="none"
            stroke={palette.terracotta}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray={progressDash}
          />

          {/* Restaurant marker */}
          <g transform={`translate(${restaurant.x}, ${restaurant.y})`}>
            <circle r="17" fill={palette.olive} stroke={palette.cream} strokeWidth="3" />
            <path
              d="M -4.5 -7 V -1.5 A 2 2 0 0 0 -0.5 -1.5 V -7 M -2.5 -7 V 6 M 4 -7 C 6.5 -4.5 6.5 -1.5 4.5 0.5 V 6"
              fill="none"
              stroke={palette.cream}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
          <g transform={`translate(${restaurant.x - labelWidth(restaurantLabel) / 2}, ${restaurant.y + 24})`}>
            <rect width={labelWidth(restaurantLabel)} height="26" rx="13" fill={palette.cream} opacity="0.97" />
            <text
              x={labelWidth(restaurantLabel) / 2}
              y="17"
              textAnchor="middle"
              fill={palette.olive}
              fontSize="11"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
            >
              {restaurantLabel}
            </text>
          </g>

          {/* Home marker */}
          <g transform={`translate(${home.x}, ${home.y})`}>
            <circle r="17" fill={palette.cream} stroke={palette.olive} strokeWidth="3" />
            <path
              d="M -6.5 0 L 0 -6 L 6.5 0 M -4.5 -1 V 6 H 4.5 V -1"
              fill="none"
              stroke={palette.olive}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <g transform={`translate(${Math.max(10, home.x - 10)}, ${home.y + 24})`}>
            <rect width={labelWidth(homeLabel)} height="26" rx="13" fill={palette.cream} opacity="0.97" />
            <text
              x="12"
              y="17"
              fill={palette.olive}
              fontSize="11"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
            >
              {homeLabel}
            </text>
          </g>

          {/* Driver marker */}
          <g transform={`translate(${driver.x}, ${driver.y})`}>
            <circle r="27" fill={palette.terracotta} opacity="0.12" />
            <circle r="17" fill={palette.terracotta} opacity="0.2" />
            <circle r="13" fill={palette.terracotta} stroke={palette.cream} strokeWidth="3" />
            <path d="M -4 -5 L 5 0 L -4 5 L -1.8 0 Z" fill={palette.cream} />
          </g>
          <g
            transform={`translate(${Math.min(
              Math.max(driver.x - labelWidth(driverLabel) / 2, 10),
              MAP_WIDTH - labelWidth(driverLabel) - 10,
            )}, ${Math.max(driver.y - 52, 10)})`}
          >
            <rect width={labelWidth(driverLabel)} height="26" rx="13" fill={palette.olive} />
            <text
              x={labelWidth(driverLabel) / 2}
              y="17"
              textAnchor="middle"
              fill={palette.cream}
              fontSize="11"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
            >
              {driverLabel}
            </text>
          </g>

          {/* Delivery start and destination captions */}
          <g fill={palette.oliveLight} fontSize="9" fontWeight="600" letterSpacing="1.8" fontFamily="Inter, sans-serif">
            <text x={restaurant.x - 26} y={restaurant.y - 26} textAnchor="end">
              PICKUP
            </text>
            <text x={home.x + 26} y={home.y - 18}>
              DROP-OFF
            </text>
          </g>

          {/* North marker */}
          <g transform="translate(842, 528)">
            <circle r="15" fill={palette.cream} opacity="0.9" />
            <path d="M 0 -8 L 4 4 L 0 1.5 L -4 4 Z" fill={palette.olive} />
            <text y="12" textAnchor="middle" fill={palette.oliveLight} fontSize="6.5" fontWeight="700">
              N
            </text>
          </g>
        </svg>

        <div className="absolute left-4 top-4 flex flex-wrap gap-2 rounded-xl bg-cream/90 px-3 py-2 shadow-soft backdrop-blur">
          <LegendDot color={palette.olive} label="Restaurant" />
          <LegendDot color={palette.terracotta} label="Driver" />
          <LegendDot color={palette.olive} label="Your door" outline />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-olive-900/8 bg-ivory px-5 py-3 text-[0.6875rem] leading-relaxed text-olive-500 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terracotta" />
          Hand-drawn illustration of the delivery route. No location permission is requested and no GPS is tracked.
        </p>
        <span className="shrink-0 uppercase tracking-[0.12em] text-olive-500">Demo mode</span>
      </div>
    </section>
  );
}

function LegendDot({ color, label, outline = false }: { color: string; label: string; outline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.625rem] text-olive-600">
      <span
        className="h-2 w-2 rounded-full"
        style={{
          backgroundColor: outline ? palette.cream : color,
          boxShadow: `inset 0 0 0 1.5px ${color}`,
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
