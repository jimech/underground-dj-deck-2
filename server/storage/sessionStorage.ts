import type { VersionedSession } from '../../shared/sessionSchema';
import type { DjProfile, DjProfileInput } from '../../shared/profileSchema';

export interface StoredSession {
  id: string;
  session: VersionedSession;
  createdAt: string;
}

export interface SessionStorage {
  saveSession(session: VersionedSession): Promise<StoredSession>;
  getSession(id: string): Promise<StoredSession | null>;
  saveProfile(id: string, profile: DjProfileInput): Promise<DjProfile>;
  getProfile(id: string): Promise<DjProfile | null>;
}

export function cloneSession(session: VersionedSession): VersionedSession {
  return JSON.parse(JSON.stringify(session)) as VersionedSession;
}

export function cloneProfile(profile: DjProfile): DjProfile {
  return JSON.parse(JSON.stringify(profile)) as DjProfile;
}
