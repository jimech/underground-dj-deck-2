import { randomBytes } from 'node:crypto';
import { cloneProfile, cloneSession, type SessionStorage, type StoredSession } from './sessionStorage';
import type { DjProfile, DjProfileInput } from '../../shared/profileSchema';
import type { VersionedSession } from '../../shared/sessionSchema';

export class MemorySessionStorage implements SessionStorage {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly profiles = new Map<string, DjProfile>();

  async saveSession(session: VersionedSession): Promise<StoredSession> {
    let id = this.createSessionId();
    while (this.sessions.has(id)) {
      id = this.createSessionId();
    }

    const stored: StoredSession = {
      id,
      session: cloneSession(session),
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(id, stored);
    return this.cloneStoredSession(stored);
  }

  async getSession(id: string): Promise<StoredSession | null> {
    const stored = this.sessions.get(id);
    if (!stored) return null;

    return this.cloneStoredSession(stored);
  }

  async saveProfile(id: string, profile: DjProfileInput): Promise<DjProfile> {
    const stored: DjProfile = {
      id,
      ...profile,
    };

    this.profiles.set(id, stored);
    return cloneProfile(stored);
  }

  async getProfile(id: string): Promise<DjProfile | null> {
    const stored = this.profiles.get(id);
    return stored ? cloneProfile(stored) : null;
  }

  private createSessionId(): string {
    return randomBytes(6).toString('base64url');
  }

  private cloneStoredSession(stored: StoredSession): StoredSession {
    return {
      ...stored,
      session: cloneSession(stored.session),
    };
  }
}
