export interface CloudinaryConfiguration {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
  /** True only when all three credentials are present. */
  enabled: boolean;
}

export interface RoutingConfiguration {
  /** `osrm` uses the road-network provider; `straight-line` forces the labelled fallback. */
  provider: 'osrm' | 'straight-line';
  enabled: boolean;
  baseUrl: string;
  /** OSRM profile segment, for example `driving`, `cycling` or a custom profile. */
  profile: string;
  timeoutMs: number;
  cacheTtlMs: number;
}

export interface TrackingConfiguration {
  /** How long a driver GPS point stays usable for assignment. */
  maxLocationAgeMinutes: number;
  /** Server-side live tracking channel (Socket.IO). */
  liveEnabled: boolean;
}

export interface AppConfiguration {
  nodeEnv: string;
  port: number;
  mongodbUri: string;
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  corsOrigins: string[];
  cloudinary: CloudinaryConfiguration;
  routing: RoutingConfiguration;
  tracking: TrackingConfiguration;
}

function parseOrigins(value: string | undefined): string[] {
  return (value ?? 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return value === 'true' || value === '1';
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default (): AppConfiguration => {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME ?? '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY ?? '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET ?? '').trim();

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number.parseInt(process.env.PORT ?? '3000', 10),
    mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/savora',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '7d',
    corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
    cloudinary: {
      cloudName,
      apiKey,
      apiSecret,
      folder: (process.env.CLOUDINARY_FOLDER ?? 'savora').trim() || 'savora',
      enabled: Boolean(cloudName && apiKey && apiSecret),
    },
    routing: {
      // OpenStreetMap's public OSRM instance needs no API key. Point
      // ROUTING_BASE_URL at your own OSRM/Mapbox-compatible router for
      // production traffic, or set ROUTING_PROVIDER=straight-line to run
      // without a provider. ROUTING_PROFILE maps to the OSRM profile segment.
      provider: process.env.ROUTING_PROVIDER === 'straight-line' ? 'straight-line' : 'osrm',
      enabled: parseBoolean(process.env.ROUTING_ENABLED, true),
      baseUrl: (process.env.ROUTING_BASE_URL ?? 'https://router.project-osrm.org')
        .trim()
        .replace(/\/+$/, ''),
      profile: (process.env.ROUTING_PROFILE ?? 'driving').trim() || 'driving',
      timeoutMs: parseNumber(process.env.ROUTING_TIMEOUT_MS, 4000),
      cacheTtlMs: parseNumber(process.env.ROUTING_CACHE_TTL_MS, 60_000),
    },
    tracking: {
      maxLocationAgeMinutes: parseNumber(
        process.env.DRIVER_LOCATION_MAX_AGE_MINUTES,
        10,
      ),
      liveEnabled: parseBoolean(process.env.LIVE_TRACKING_ENABLED, true),
    },
  };
};

/**
 * Fail fast when a required setting is missing. Secrets are never defaulted,
 * because a predictable token secret would make every access token forgeable.
 */
export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const secret = typeof config.JWT_ACCESS_SECRET === 'string' ? config.JWT_ACCESS_SECRET : '';
  if (secret.trim().length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be set to a random value of at least 32 characters.');
  }

  const mongoUri =
    typeof config.MONGODB_URI === 'string' && config.MONGODB_URI.trim()
      ? config.MONGODB_URI.trim()
      : 'mongodb://127.0.0.1:27017/savora';
  config.MONGODB_URI = mongoUri;

  const port = Number.parseInt(String(config.PORT ?? '3000'), 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }
  config.PORT = port;

  return config;
}
