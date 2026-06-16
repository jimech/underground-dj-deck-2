import type { VersionedSession } from '../../shared/sessionSchema';

export interface StoredSession {
  id: string;
  session: VersionedSession;
  createdAt: string;
}

export interface SessionStorage {
  saveSession(session: VersionedSession): Promise<StoredSession>;
  getSession(id: string): Promise<StoredSession | null>;
}

export function cloneSession(session: VersionedSession): VersionedSession {
  return JSON.parse(JSON.stringify(session)) as VersionedSession;
}
