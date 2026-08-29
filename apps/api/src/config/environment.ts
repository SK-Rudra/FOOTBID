const allowedNodeEnvironments = ['development', 'test', 'production'];

function requireString(
  environment: Record<string, unknown>,
  key: string,
): string {
  const value = environment[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function readPositiveInteger(
  environment: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const rawValue = environment[key] ?? fallback;
  const value = Number(rawValue);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return value;
}

function validateUrl(value: string, key: string): string {
  try {
    new URL(value);
    return value;
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnvironment =
    typeof environment['NODE_ENV'] === 'string'
      ? environment['NODE_ENV']
      : 'development';

  if (!allowedNodeEnvironments.includes(nodeEnvironment)) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }

  const accessSecret = requireString(environment, 'JWT_ACCESS_SECRET');
  const refreshSecret = requireString(environment, 'JWT_REFRESH_SECRET');

  if (accessSecret.length < 43 || refreshSecret.length < 43) {
    throw new Error('JWT secrets must contain at least 43 characters.');
  }

  if (accessSecret === refreshSecret) {
    throw new Error('JWT access and refresh secrets must be different.');
  }

  const accessTtlSeconds = readPositiveInteger(
    environment,
    'JWT_ACCESS_TTL_SECONDS',
    900,
  );

  const refreshTtlSeconds = readPositiveInteger(
    environment,
    'JWT_REFRESH_TTL_SECONDS',
    604_800,
  );

  if (accessTtlSeconds >= refreshTtlSeconds) {
    throw new Error(
      'JWT access lifetime must be shorter than refresh lifetime.',
    );
  }

  return {
    ...environment,
    NODE_ENV: nodeEnvironment,
    PORT: readPositiveInteger(environment, 'PORT', 4000),
    WEB_URL: validateUrl(
      typeof environment['WEB_URL'] === 'string'
        ? environment['WEB_URL']
        : 'http://localhost:3000',
      'WEB_URL',
    ),
    DATABASE_URL: validateUrl(
      requireString(environment, 'DATABASE_URL'),
      'DATABASE_URL',
    ),
    JWT_ACCESS_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
    JWT_ACCESS_TTL_SECONDS: accessTtlSeconds,
    JWT_REFRESH_TTL_SECONDS: refreshTtlSeconds,
    JWT_ISSUER: requireString(environment, 'JWT_ISSUER'),
    JWT_AUDIENCE: requireString(environment, 'JWT_AUDIENCE'),
  };
}
