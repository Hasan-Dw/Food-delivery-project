/**
 * Runtime configuration. Every environment-dependent value is read here once
 * so the rest of the app never touches `import.meta.env` directly.
 */

function toBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
const isProduction = import.meta.env.PROD;
const requestedDataSource = import.meta.env.VITE_DATA_SOURCE;

/**
 * Production builds never fall back to in-browser demo data. A missing API URL
 * is a deployment error that must surface loudly instead of silently serving
 * fake accounts and orders to real customers.
 */
const dataSource: 'mock' | 'http' = isProduction
  ? 'http'
  : requestedDataSource === 'http' || requestedDataSource === 'mock'
    ? requestedDataSource
    : rawBaseUrl
      ? 'http'
      : 'mock';

/** Human-readable deployment problem, empty when configuration is valid. */
const configError =
  dataSource === 'http' && !rawBaseUrl
    ? 'VITE_API_BASE_URL is not set. The production build cannot reach the Savora API.'
    : '';

if (isProduction && !rawBaseUrl) {
  // Fails visibly in the browser console and in any monitoring that captures it.
  console.error(`[Savora] ${configError}`);
}

export const env = {
  apiBaseUrl: rawBaseUrl,
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000) || 15000,
  dataSource,
  mapProvider: import.meta.env.VITE_MAP_PROVIDER ?? 'preview',
  mapToken: import.meta.env.VITE_MAP_TOKEN ?? '',
  isDev: import.meta.env.DEV,
  isProduction,
  configError,
  useMocks: dataSource === 'mock' || !rawBaseUrl,
  features: {
    /**
     * Live Socket.IO tracking is on by default for HTTP deployments. Set
     * `VITE_LIVE_TRACKING=false` to fall back to REST snapshots only.
     */
    liveTracking: toBool(import.meta.env.VITE_LIVE_TRACKING, dataSource === 'http'),
  },
} as const;

export type DataSource = typeof env.dataSource;
