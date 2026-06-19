import { describe, expect, it } from 'vitest';
import { validateApiHealthPayload } from './smoke-production.mjs';

describe('production smoke health validation', () => {
  it('accepts matching Supabase storage health', () => {
    expect(() => validateApiHealthPayload({
      ok: true,
      storage: {
        activeDriver: 'supabase',
        persistent: true,
      },
    }, 'supabase')).not.toThrow();
  });

  it('rejects memory storage when Supabase is expected', () => {
    expect(() => validateApiHealthPayload({
      ok: true,
      storage: {
        activeDriver: 'memory',
        persistent: false,
      },
    }, 'supabase')).toThrow('expected "supabase"');
  });
});
