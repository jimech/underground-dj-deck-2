import { randomBytes } from 'node:crypto';
import type { VersionedSession } from '../shared/sessionSchema';

export interface StoredSession {
  id: string;
  session: VersionedSession;
  createdAt: string;
}

const sessions = new Map<string, StoredSession>();

function cloneSession(session: VersionedSession): VersionedSession {
  return JSON.parse(JSON.stringify(session)) as VersionedSession;
}

function createSessionId(): string {
  return randomBytes(6).toString('base64url');
}

export function saveSession(session: VersionedSession): StoredSession {
  let id = createSessionId();
  while (sessions.has(id)) {
    id = createSessionId();
  }

  const stored: StoredSession = {
    id,
    session: cloneSession(session),
    createdAt: new Date().toISOString(),
  };

  sessions.set(id, stored);
  return {
    ...stored,
    session: cloneSession(stored.session),
  };
}

export function getSession(id: string): StoredSession | null {
  const stored = sessions.get(id);
  if (!stored) return null;

  return {
    ...stored,
    session: cloneSession(stored.session),
  };
}
