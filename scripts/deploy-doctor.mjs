import 'dotenv/config';

const productionMode = process.argv.includes('--production');

const REQUIRED_FRONTEND = [
  'VITE_API_BASE_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const REQUIRED_BACKEND = [
  'APP_URL',
  'SESSION_STORAGE_DRIVER',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const OPTIONAL_BACKEND = [
  'GEMINI_API_KEY',
  'CORS_ALLOWED_ORIGINS',
];

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function looksPlaceholder(value) {
  if (!hasValue(value)) return false;
  return /^(YOUR_|MY_|CHANGE_ME|TODO)/i.test(value.trim())
    || value.includes('YOUR_')
    || value.includes('example.com');
}

function isLocalUrl(value) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
}

function publicSecretLeaks(env) {
  return Object.keys(env)
    .filter((key) => key.startsWith('VITE_'))
    .filter((key) => /SERVICE_ROLE|GEMINI|SECRET|PRIVATE|TOKEN/i.test(key));
}

function addCheck(checks, level, label, detail) {
  checks.push({ level, label, detail });
}

export function inspectDeployEnv(env = process.env, options = {}) {
  const checks = [];
  const isProduction = Boolean(options.production);

  for (const key of REQUIRED_FRONTEND) {
    if (!hasValue(env[key])) {
      addCheck(checks, 'fail', key, 'Missing frontend env var.');
    } else if (looksPlaceholder(env[key])) {
      addCheck(checks, 'fail', key, 'Still using a placeholder value.');
    } else if (isProduction && key.includes('URL') && isLocalUrl(env[key])) {
      addCheck(checks, 'fail', key, 'Production URL cannot point to localhost.');
    } else {
      addCheck(checks, 'pass', key, 'Configured.');
    }
  }

  for (const key of REQUIRED_BACKEND) {
    if (!hasValue(env[key])) {
      addCheck(checks, 'fail', key, 'Missing backend env var.');
    } else if (looksPlaceholder(env[key])) {
      addCheck(checks, 'fail', key, 'Still using a placeholder value.');
    } else if (isProduction && key.includes('URL') && isLocalUrl(env[key])) {
      addCheck(checks, 'fail', key, 'Production URL cannot point to localhost.');
    } else {
      addCheck(checks, 'pass', key, 'Configured.');
    }
  }

  if (isProduction && env.SESSION_STORAGE_DRIVER !== 'supabase') {
    addCheck(checks, 'fail', 'SESSION_STORAGE_DRIVER', 'Production should use "supabase".');
  }

  for (const key of OPTIONAL_BACKEND) {
    if (!hasValue(env[key])) {
      addCheck(checks, 'warn', key, 'Optional value is not set.');
    } else if (looksPlaceholder(env[key])) {
      addCheck(checks, 'warn', key, 'Optional value still looks like a placeholder.');
    } else {
      addCheck(checks, 'pass', key, 'Configured.');
    }
  }

  for (const key of publicSecretLeaks(env)) {
    addCheck(checks, 'fail', key, 'Secret-looking value name is exposed through VITE_ public env.');
  }

  addCheck(checks, 'manual', 'Supabase Auth redirects', 'Confirm local and production frontend URLs in Supabase Auth URL settings.');
  addCheck(checks, 'manual', 'Provider dashboards', 'Enter real secrets only in local .env or deployment dashboards, never in git.');

  return {
    production: isProduction,
    checks,
    failures: checks.filter((check) => check.level === 'fail'),
    warnings: checks.filter((check) => check.level === 'warn'),
  };
}

function formatCheck(check) {
  const prefix = {
    pass: 'PASS',
    fail: 'FAIL',
    warn: 'WARN',
    manual: 'TODO',
  }[check.level];

  return `${prefix} ${check.label}: ${check.detail}`;
}

export function formatDeployEnvReport(result) {
  const lines = [
    `Deploy doctor (${result.production ? 'production' : 'local'} mode)`,
    'No secret values are printed by this report.',
    '',
    ...result.checks.map(formatCheck),
    '',
    `Summary: ${result.failures.length} failure(s), ${result.warnings.length} warning(s).`,
  ];

  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = inspectDeployEnv(process.env, { production: productionMode });
  console.log(formatDeployEnvReport(result));
  if (result.failures.length > 0) process.exit(1);
}
