const LOCAL_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/$/, '');
}

export function getAllowedOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const origins = new Set(LOCAL_ORIGINS);
  const appUrl = env.APP_URL;
  const extraOrigins = env.CORS_ALLOWED_ORIGINS;

  if (appUrl) origins.add(normalizeOrigin(appUrl));

  if (extraOrigins) {
    for (const origin of extraOrigins.split(',')) {
      const normalized = normalizeOrigin(origin);
      if (normalized) origins.add(normalized);
    }
  }

  return origins;
}

export function isAllowedOrigin(origin: string | undefined, env: NodeJS.ProcessEnv = process.env) {
  if (!origin) return false;
  return getAllowedOrigins(env).has(normalizeOrigin(origin));
}
