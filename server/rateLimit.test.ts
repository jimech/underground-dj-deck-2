import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRateLimit } from './rateLimit';

function createReq(options: { ip?: string; authorization?: string } = {}) {
  return {
    headers: options.authorization ? { authorization: options.authorization } : {},
    ip: options.ip || '127.0.0.1',
    socket: { remoteAddress: options.ip || '127.0.0.1' },
  };
}

function createRes() {
  const response = new EventEmitter() as EventEmitter & {
    headers: Record<string, string>;
    statusCode: number;
    body?: unknown;
    setHeader: (name: string, value: string) => void;
    status: (code: number) => typeof response;
    json: (body: unknown) => void;
  };

  response.headers = {};
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
  vi.useRealTimers();
});

describe('createRateLimit', () => {
  it('allows requests up to the limit and then returns 429', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T00:00:00.000Z'));
    const limiter = createRateLimit({ name: 'test-write-limit', maxRequests: 2, windowMs: 60_000 });

    const firstNext = vi.fn();
    limiter(createReq() as any, createRes() as any, firstNext);
    expect(firstNext).toHaveBeenCalledOnce();

    const secondNext = vi.fn();
    limiter(createReq() as any, createRes() as any, secondNext);
    expect(secondNext).toHaveBeenCalledOnce();

    const thirdRes = createRes();
    const thirdNext = vi.fn();
    limiter(createReq() as any, thirdRes as any, thirdNext);

    expect(thirdNext).not.toHaveBeenCalled();
    expect(thirdRes.statusCode).toBe(429);
    expect(thirdRes.headers['Retry-After']).toBe('60');
    expect(thirdRes.body).toMatchObject({
      error: 'Rate limit exceeded',
    });
  });

  it('uses bearer identities as separate buckets without echoing credentials', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T00:00:00.000Z'));
    const limiter = createRateLimit({ name: 'test-auth-buckets', maxRequests: 1, windowMs: 60_000 });

    limiter(createReq({ authorization: 'Bearer fixture-a' }) as any, createRes() as any, vi.fn());

    const secondTokenNext = vi.fn();
    limiter(createReq({ authorization: 'Bearer fixture-b' }) as any, createRes() as any, secondTokenNext);
    expect(secondTokenNext).toHaveBeenCalledOnce();

    const blockedRes = createRes();
    limiter(createReq({ authorization: 'Bearer fixture-a' }) as any, blockedRes as any, vi.fn());
    expect(blockedRes.statusCode).toBe(429);
    expect(JSON.stringify(blockedRes.body)).not.toContain('fixture-a');
  });
});
