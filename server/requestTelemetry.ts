import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler, Request, RequestHandler } from 'express';

export function getRequestId(req: Request): string {
  const header = req.headers['x-request-id'];
  if (typeof header === 'string' && header.trim()) return header.slice(0, 100);
  if (Array.isArray(header) && header[0]) return header[0].slice(0, 100);
  return randomUUID();
}

export function requestTelemetry(): RequestHandler {
  return (req, res, next) => {
    const requestId = getRequestId(req);
    const startedAt = Date.now();

    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      console.info(JSON.stringify({
        level: 'info',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
      }));
    });

    next();
  };
}

export function isPayloadTooLargeError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: unknown }).type === 'entity.too.large'
  );
}

export const apiErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;

  if (isPayloadTooLargeError(err)) {
    res.status(413).json({
      error: 'Payload too large',
      detail: 'Request body must be 1 MB or smaller.',
      requestId,
    });
    return;
  }

  console.error(JSON.stringify({
    level: 'error',
    requestId,
    error: err instanceof Error ? err.message : 'Unknown error',
  }));
  res.status(500).json({
    error: 'Internal server error',
    requestId,
  });
};
