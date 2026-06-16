import type { VersionedSession } from '../../shared/sessionSchema';
import type { DjProfile, DjProfileInput } from '../../shared/profileSchema';

export interface StoredSession {
  id: string;
  session: VersionedSession;
  createdAt: string;
  userId?: string;
  visibility: 'public' | 'private';
}

export interface SessionStorage {
  saveSession(session: VersionedSession, options?: { userId?: string; visibility?: 'public' | 'private' }): Promise<StoredSession>;
  getSession(id: string, options?: { userId?: string }): Promise<StoredSession | null>;
  saveProfile(id: string, profile: DjProfileInput, userId?: string): Promise<DjProfile>;
  getProfile(id: string): Promise<DjProfile | null>;
}

export function cloneSession(session: VersionedSession): VersionedSession {
  return JSON.parse(JSON.stringify(session)) as VersionedSession;
}

export function cloneProfile(profile: DjProfile): DjProfile {
  return JSON.parse(JSON.stringify(profile)) as DjProfile;
}
