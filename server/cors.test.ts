import { describe, expect, it } from 'vitest';
import { getAllowedOrigins, isAllowedOrigin } from './cors';

describe('cors origin allowlist', () => {
  it('allows local dev origins by default', () => {
    expect(isAllowedOrigin('http://localhost:3000', {})).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3000', {})).toBe(true);
  });

  it('allows APP_URL and comma-separated extra origins without wildcarding unknown sites', () => {
    const env = {
      APP_URL: 'https://app.example.com/',
      CORS_ALLOWED_ORIGINS: 'https://preview.example.com, https://branch.example.com/',
    };

    expect(isAllowedOrigin('https://app.example.com', env)).toBe(true);
    expect(isAllowedOrigin('https://preview.example.com', env)).toBe(true);
    expect(isAllowedOrigin('https://branch.example.com', env)).toBe(true);
    expect(isAllowedOrigin('https://evil.example.com', env)).toBe(false);
  });

  it('deduplicates normalized origins', () => {
    const origins = getAllowedOrigins({
      APP_URL: 'https://app.example.com/',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com,https://app.example.com/',
    });

    expect([...origins].filter((origin) => origin === 'https://app.example.com')).toHaveLength(1);
  });
});
