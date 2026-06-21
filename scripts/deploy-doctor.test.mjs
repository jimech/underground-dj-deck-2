import { describe, expect, it } from 'vitest';
import { formatDeployEnvReport, inspectDeployEnv } from './deploy-doctor.mjs';

const completeProductionEnv = {
  APP_URL: 'https://app.example-host.test',
  SESSION_STORAGE_DRIVER: 'supabase',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only-value',
  VITE_API_BASE_URL: 'https://api.example-host.test',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'public-anon-value',
};

describe('deploy doctor env inspection', () => {
  it('accepts complete production env without printing secret values', () => {
    const result = inspectDeployEnv(completeProductionEnv, { production: true });
    const report = formatDeployEnvReport(result);

    expect(result.failures).toHaveLength(0);
    expect(report).toContain('Deploy doctor (production mode)');
    expect(report).not.toContain('server-only-value');
    expect(report).not.toContain('public-anon-value');
  });

  it('rejects localhost URLs in production mode', () => {
    const result = inspectDeployEnv({
      ...completeProductionEnv,
      VITE_API_BASE_URL: 'http://localhost:8787',
    }, { production: true });

    expect(result.failures.some((check) => check.label === 'VITE_API_BASE_URL')).toBe(true);
  });

  it('rejects secret-looking public VITE variables', () => {
    const result = inspectDeployEnv({
      ...completeProductionEnv,
      VITE_SUPABASE_SERVICE_ROLE_KEY: 'do-not-expose',
    }, { production: true });

    expect(result.failures.some((check) => check.label === 'VITE_SUPABASE_SERVICE_ROLE_KEY')).toBe(true);
  });
});
