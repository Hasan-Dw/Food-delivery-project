export interface AppConfiguration {
  nodeEnv: string;
  port: number;
  mongodbUri: string;
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  corsOrigins: string[];
}

function parseOrigins(value: string | undefined): string[] {
  return (value ?? 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default (): AppConfiguration => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/savora',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '7d',
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
});

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
