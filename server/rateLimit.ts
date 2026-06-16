import { createHash } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  name: string;
  maxRequests: number;
  windowMs: number;
}

const buckets = new Map<string, RateLimitBucket>();
let lastCleanupAt = 0;

function getPositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getClientIdentity(req: Request): string {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (token) {
      return `auth:${createHash('sha256').update(token).digest('hex').slice(0, 16)}`;
    }
  }

  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function createRateLimit(options: RateLimitOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    cleanupExpiredBuckets(now);

    const key = `${options.name}:${getClientIdentity(req)}`;
    const existing = buckets.get(key);
    const bucket = existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + options.windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(options.maxRequests - bucket.count, 0);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    res.setHeader('X-RateLimit-Limit', options.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000).toString());

    if (bucket.count > options.maxRequests) {
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.status(429).json({
        error: 'Rate limit exceeded',
        detail: `Too many ${options.name} requests. Try again in ${retryAfterSeconds} seconds.`,
      });
      return;
    }

    next();
  };
}

export const aiRateLimit = createRateLimit({
  name: 'AI',
  maxRequests: getPositiveIntegerEnv('AI_RATE_LIMIT_MAX', 20),
  windowMs: getPositiveIntegerEnv('AI_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000),
});

export const writeRateLimit = createRateLimit({
  name: 'write',
  maxRequests: getPositiveIntegerEnv('WRITE_RATE_LIMIT_MAX', 120),
  windowMs: getPositiveIntegerEnv('WRITE_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000),
});
