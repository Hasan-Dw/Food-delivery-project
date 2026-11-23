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
const hasApiPrefix = /(?:^|\/)api\/v1$/i.test(rawBaseUrl);

/**
 * The application is API-backed in every environment. There is deliberately no
 * in-browser demo data source: a missing API URL is a deployment error that
 * must surface loudly instead of silently serving fake accounts and orders.
 */
const configError = rawBaseUrl
  ? ''
  : 'VITE_API_BASE_URL is not set. The app cannot reach the Savora API.';
const apiConfigError = rawBaseUrl && !hasApiPrefix
  ? 'VITE_API_BASE_URL must include the /api/v1 prefix.'
  : configError;

if (apiConfigError) {
  // Fails visibly in the browser console and in any monitoring that captures it.
  console.error(`[Savora] ${apiConfigError}`);
}

export const env = {
  apiBaseUrl: rawBaseUrl,
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000) || 15000,
  mapProvider: import.meta.env.VITE_MAP_PROVIDER ?? 'preview',
  mapToken: import.meta.env.VITE_MAP_TOKEN ?? '',
  isDev: import.meta.env.DEV,
  isProduction,
  configError: apiConfigError,
  features: {
    /**
     * Live Socket.IO tracking is on by default. Set `VITE_LIVE_TRACKING=false`
     * to fall back to REST snapshots only.
     */
    liveTracking: toBool(import.meta.env.VITE_LIVE_TRACKING, true),
  },
} as const;
