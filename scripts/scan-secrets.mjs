import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MAX_FILE_BYTES = 2_000_000;

const detectors = [
  {
    name: 'Google API key',
    regex: /AIza[0-9A-Za-z_-]{35}/g,
  },
  {
    name: 'OpenAI API key',
    regex: /sk-[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: 'Stripe live secret key',
    regex: /\b(?:sk_live|rk_live)_[A-Za-z0-9]{20,}\b/g,
  },
  {
    name: 'GitHub token',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    name: 'Private key block',
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    name: 'Database URL with password',
    regex: /\bpostgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@[^/\s]+/gi,
  },
];

function getCandidateFiles() {
  return execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

function isProbablyText(buffer) {
  return !buffer.includes(0);
}

function lineNumberForIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function findSupabaseServiceRoleJwt(text) {
  const findings = [];
  const jwtRegex = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

  for (const match of text.matchAll(jwtRegex)) {
    try {
      const [, payloadPart] = match[0].split('.');
      const payload = JSON.parse(decodeBase64Url(payloadPart));
      if (payload?.role === 'service_role') {
        findings.push({
          name: 'Supabase service-role JWT',
          index: match.index ?? 0,
        });
      }
    } catch {
      // Ignore malformed JWT-like strings; other detectors can still catch them.
    }
  }

  return findings;
}

const findings = [];

for (const file of getCandidateFiles()) {
  const buffer = readFileSync(file);
  if (buffer.length > MAX_FILE_BYTES || !isProbablyText(buffer)) continue;

  const text = buffer.toString('utf8');

  for (const detector of detectors) {
    for (const match of text.matchAll(detector.regex)) {
      findings.push({
        file,
        line: lineNumberForIndex(text, match.index ?? 0),
        name: detector.name,
      });
    }
  }

  for (const finding of findSupabaseServiceRoleJwt(text)) {
    findings.push({
      file,
      line: lineNumberForIndex(text, finding.index),
      name: finding.name,
    });
  }
}

if (findings.length > 0) {
  console.error('Potential secrets found in repository files:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.name}`);
  }
  process.exit(1);
}

console.log('Secret scan: ok');
