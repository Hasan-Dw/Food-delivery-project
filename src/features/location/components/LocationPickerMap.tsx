import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import type { Coordinates } from '@/types';
import { cn } from '@/lib/cn';
import {
  nominatimGeocoder,
  type GeocodedPlace,
  type GeocodingProvider,
} from '../geocoding';

const DEFAULT_CENTER: Coordinates = { lat: 40.7128, lng: -74.006 };
const DEFAULT_ZOOM = 14;

const markerIcon = L.divIcon({
  className: '',
  html:
    '<span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px 9999px 9999px 4px;transform:rotate(-45deg);background:#C65D3B;border:3px solid #FBF8F1;box-shadow:0 6px 16px rgba(53,70,56,0.35);">' +
    '<span style="display:block;width:10px;height:10px;border-radius:9999px;background:#FBF8F1;transform:rotate(45deg);"></span>' +
    '</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 32],
});

function MapInteraction({
  onPick,
  disabled,
}: {
  onPick: (coordinates: Coordinates) => void;
  disabled?: boolean;
}) {
  useMapEvents({
    click(event) {
      if (disabled) return;
      onPick({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

/** Keeps the canvas correct after responsive layout changes. */
function MapResize() {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const timer = window.setTimeout(invalidate, 60);
    window.addEventListener('resize', invalidate);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', invalidate);
    };
  }, [map]);

  return null;
}

/** Follows external changes such as a geocoder result or geolocation. */
function MapRecenter({ value }: { value?: Coordinates | null }) {
  const map = useMap();
  const last = useRef<string>('');

  useEffect(() => {
    if (!value) return;
    const key = `${value.lat},${value.lng}`;
    if (key === last.current) return;
    last.current = key;
    map.panTo([value.lat, value.lng], { animate: true });
  }, [map, value]);

  return null;
}

export interface LocationPickerMapProps {
  value?: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
  /** Called with the reverse-geocoded place so forms can prefill address fields. */
  onResolveAddress?: (place: GeocodedPlace | null) => void;
  center?: Coordinates;
  className?: string;
  heightClassName?: string;
  disabled?: boolean;
  geocoder?: GeocodingProvider;
  /** Show the address search box. Disable where only a pin is needed. */
  searchable?: boolean;
}

/**
 * Reusable Leaflet + OpenStreetMap location picker.
 *
 * Users can click the map, drag the marker, search for an address or use the
 * browser's current position. Geocoding is optional: map selection and manual
 * address entry keep working when the public geocoder is unavailable.
 */
export function LocationPickerMap({
  value,
  onChange,
  onResolveAddress,
  center,
  className,
  heightClassName = 'h-80',
  disabled = false,
  geocoder = nominatimGeocoder,
  searchable = true,
}: LocationPickerMapProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const resolveRef = useRef(onResolveAddress);
  const skipNextReverse = useRef(false);
  const searchRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    resolveRef.current = onResolveAddress;
  }, [onResolveAddress]);

  const initialCenter = value ?? center ?? DEFAULT_CENTER;

  const pick = (coordinates: Coordinates) => {
    if (disabled) return;
    setLocationError(null);
    onChange({
      lat: Number(coordinates.lat.toFixed(6)),
      lng: Number(coordinates.lng.toFixed(6)),
    });
  };

  const applyPlace = (place: GeocodedPlace) => {
    skipNextReverse.current = true;
    setQuery(place.displayName);
    setResults([]);
    setSearchError(null);
    onChange(place.coordinates);
    resolveRef.current?.(place);
  };

  const runSearch = async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }

    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearching(true);
    setSearchError(null);

    try {
      const found = await geocoder.search(trimmed, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setResults(found);
      if (found.length === 0) {
        setSearchError('No matching places. Try a street, neighbourhood or postcode.');
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setResults([]);
      setSearchError(
        error instanceof Error && error.message
          ? `${error.message} You can still pick the location on the map.`
          : 'Address search is unavailable. Pick the location on the map instead.',
      );
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  };

  // Debounced search respects Nominatim's usage policy in addition to the
  // request throttle inside the provider.
  useEffect(() => {
    if (!searchable) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(trimmed);
    }, 650);

    return () => window.clearTimeout(timer);
    // `runSearch` closes over the current geocoder only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchable, geocoder]);

  // Reverse geocode map picks so the form can offer a real street address.
  useEffect(() => {
    if (!value) return;
    if (skipNextReverse.current) {
      skipNextReverse.current = false;
      return;
    }

    const controller = new AbortController();
    setResolving(true);

    const timer = window.setTimeout(() => {
      geocoder
        .reverse(value, { signal: controller.signal })
        .then((place) => {
          if (!controller.signal.aborted) resolveRef.current?.(place);
        })
        .catch(() => {
          if (!controller.signal.aborted) resolveRef.current?.(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setResolving(false);
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng, geocoder]);

  const useMyLocation = () => {
    if (disabled) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('This browser does not support current-location selection.');
      return;
    }

    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        pick({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Pick the delivery point on the map.'
            : 'Your current location could not be read. Pick the point on the map instead.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-olive-900/12 bg-ivory',
        className,
      )}
    >
      <div className="relative">
        <div className={cn('w-full', heightClassName)}>
          <MapContainer
            center={[initialCenter.lat, initialCenter.lng]}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapInteraction onPick={pick} disabled={disabled} />
            <MapRecenter value={value} />
            <MapResize />
            {value ? (
              <Marker
                position={[value.lat, value.lng]}
                icon={markerIcon}
                draggable={!disabled}
                eventHandlers={{
                  dragend: (event) => {
                    const marker = event.target as L.Marker;
                    const next = marker.getLatLng();
                    pick({ lat: next.lat, lng: next.lng });
                  },
                }}
              />
            ) : null}
          </MapContainer>
        </div>

        {searchable ? (
          <div className="absolute inset-x-3 top-3 z-[1000]">
            <div className="flex items-center gap-2 rounded-xl border border-olive-900/12 bg-ivory/95 p-1.5 shadow-[0_10px_30px_-18px_rgba(73,56,46,0.55)] backdrop-blur">
              <Search aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 text-olive-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void runSearch(query);
                  }
                }}
                placeholder="Search for an address or place"
                aria-label="Search for an address or place"
                className="min-w-0 flex-1 bg-transparent py-2 text-[0.8125rem] text-olive-800 placeholder:text-olive-400 focus:outline-none"
                disabled={disabled}
              />
              {searching ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-olive-500" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setSearchError(null);
                    searchRequest.current?.abort();
                  }}
                  aria-label="Clear address search"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-olive-400 transition hover:bg-olive-900/5 hover:text-olive-700"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            {results.length > 0 ? (
              <ul className="mt-1.5 max-h-56 overflow-auto rounded-xl border border-olive-900/12 bg-ivory/98 py-1 shadow-[0_16px_40px_-20px_rgba(73,56,46,0.6)] backdrop-blur">
                {results.map((place, index) => (
                  <li key={`${place.coordinates.lat},${place.coordinates.lng},${index}`}>
                    <button
                      type="button"
                      onClick={() => applyPlace(place)}
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-olive-900/5"
                    >
                      <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terracotta-600" />
                      <span className="text-[0.75rem] leading-relaxed text-olive-700">
                        {place.displayName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {searchError ? (
              <p className="mt-1.5 rounded-lg bg-ivory/95 px-3 py-2 text-[0.6875rem] leading-relaxed text-terracotta-700 shadow">
                {searchError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[1000] flex flex-wrap items-end justify-between gap-2">
          <div className="pointer-events-auto rounded-lg bg-ivory/95 px-3 py-1.5 text-[0.6875rem] font-medium text-olive-600 shadow backdrop-blur">
            {value ? (
              <span>
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
                {resolving ? <span className="ml-2 text-olive-400">Finding address…</span> : null}
              </span>
            ) : (
              <span className="text-olive-500">Click the map to drop a pin</span>
            )}
          </div>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={disabled || locating}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-olive-900/12 bg-ivory/95 px-3 py-1.5 text-[0.6875rem] font-semibold text-olive-700 shadow backdrop-blur transition hover:bg-cream disabled:opacity-60"
          >
            {locating ? (
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            Use my location
          </button>
        </div>
      </div>

      {locationError ? (
        <p className="border-t border-olive-900/8 px-3 py-2 text-[0.6875rem] text-terracotta-700">
          {locationError}
        </p>
      ) : null}
    </div>
  );
}
