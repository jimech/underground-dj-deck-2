import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiErrorHandler, requestTelemetry } from './requestTelemetry';

function createReq(options: { requestId?: string } = {}) {
  return {
    headers: options.requestId ? { 'x-request-id': options.requestId } : {},
    method: 'GET',
    path: '/api/health',
  };
}

function createRes() {
  const response = new EventEmitter() as EventEmitter & {
    headers: Record<string, string>;
    locals: Record<string, unknown>;
    statusCode: number;
    body?: unknown;
    setHeader: (name: string, value: string) => void;
    status: (code: number) => typeof response;
    json: (body: unknown) => void;
  };

  response.headers = {};
  response.locals = {};
  response.statusCode = 200;
  response.setHeader = vi.fn((name: string, value: string) => {
    response.headers[name] = value;
  });
  response.status = vi.fn((code: number) => {
    response.statusCode = code;
    return response;
  });
  response.json = vi.fn((body: unknown) => {
    response.body = body;
  });

  return response;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requestTelemetry', () => {
  it('reuses incoming request IDs and logs safe completion metadata', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const req = createReq({ requestId: 'client-request-id' });
    const res = createRes();
    const next = vi.fn();

    requestTelemetry()(req as any, res as any, next);
    res.emit('finish');

    expect(next).toHaveBeenCalledOnce();
    expect(res.headers['X-Request-Id']).toBe('client-request-id');
    expect(res.locals.requestId).toBe('client-request-id');

    const logged = JSON.parse(infoSpy.mock.calls[0][0] as string);
    expect(logged).toMatchObject({
      level: 'info',
      requestId: 'client-request-id',
      method: 'GET',
      path: '/api/health',
      status: 200,
    });
    expect(JSON.stringify(logged)).not.toContain('authorization');
  });

  it('adds request IDs to payload-too-large responses', () => {
    const res = createRes();
    res.locals.requestId = 'too-large-request';

    apiErrorHandler({ type: 'entity.too.large' }, createReq() as any, res as any, vi.fn());

    expect(res.statusCode).toBe(413);
    expect(res.body).toMatchObject({
      error: 'Payload too large',
      requestId: 'too-large-request',
    });
  });
});
