import { describe, expect, it } from 'vitest';

describe('session storage status', () => {
  it('exports non-sensitive active storage metadata', async () => {
    const { sessionStorageStatus } = await import('./index');

    expect(sessionStorageStatus).toMatchObject({
      configuredDriver: expect.stringMatching(/^(memory|supabase)$/),
      activeDriver: expect.stringMatching(/^(memory|supabase)$/),
      persistent: expect.any(Boolean),
    });
    expect(JSON.stringify(sessionStorageStatus)).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});
