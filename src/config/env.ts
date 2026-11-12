/**
 * Runtime configuration. Every environment-dependent value is read here once
 * so the rest of the app never touches `import.meta.env` directly.
 */

function toBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

const requestedDataSource = import.meta.env.VITE_DATA_SOURCE;
const dataSource: 'mock' | 'http' =
  requestedDataSource === 'http' || requestedDataSource === 'mock'
    ? requestedDataSource
    : rawBaseUrl
      ? 'http'
      : 'mock';

export const env = {
  apiBaseUrl: rawBaseUrl,
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000) || 15000,
  dataSource,
  mapProvider: import.meta.env.VITE_MAP_PROVIDER ?? 'preview',
  mapToken: import.meta.env.VITE_MAP_TOKEN ?? '',
  isDev: import.meta.env.DEV,
  useMocks: dataSource === 'mock' || !rawBaseUrl,
  features: {
    /** Set once the backend exposes SSE/WebSocket tracking. */
    liveTracking: toBool(import.meta.env.VITE_LIVE_TRACKING, false),
  },
} as const;

export type DataSource = typeof env.dataSource;
