import { randomBytes } from 'node:crypto';
import { cloneProfile, cloneSession, type SessionStorage, type StoredSession } from './sessionStorage';
import type { DjProfile, DjProfileInput } from '../../shared/profileSchema';
import type { VersionedSession } from '../../shared/sessionSchema';

export class MemorySessionStorage implements SessionStorage {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly profiles = new Map<string, DjProfile>();

  async saveSession(
    session: VersionedSession,
    options: { userId?: string; visibility?: 'public' | 'private' } = {},
  ): Promise<StoredSession> {
    let id = this.createSessionId();
    while (this.sessions.has(id)) {
      id = this.createSessionId();
    }

    const stored: StoredSession = {
      id,
      session: cloneSession(session),
      createdAt: new Date().toISOString(),
      ...(options.userId ? { userId: options.userId } : {}),
      visibility: options.visibility || 'public',
    };

    this.sessions.set(id, stored);
    return this.cloneStoredSession(stored);
  }

  async getSession(id: string, options: { userId?: string } = {}): Promise<StoredSession | null> {
    const stored = this.sessions.get(id);
    if (!stored) return null;
    if (stored.visibility === 'private' && stored.userId !== options.userId) return null;

    return this.cloneStoredSession(stored);
  }

  async listSessions(options: { userId: string }): Promise<StoredSession[]> {
    return Array.from(this.sessions.values())
      .filter((stored) => stored.userId === options.userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((stored) => this.cloneStoredSession(stored));
  }

  async updateSession(id: string, session: VersionedSession, options: { userId: string }): Promise<StoredSession | null> {
    const stored = this.sessions.get(id);
    if (!stored || stored.userId !== options.userId) return null;

    const updated: StoredSession = {
      ...stored,
      session: cloneSession(session),
    };
    this.sessions.set(id, updated);
    return this.cloneStoredSession(updated);
  }

  async deleteSession(id: string, options: { userId: string }): Promise<boolean> {
    const stored = this.sessions.get(id);
    if (!stored || stored.userId !== options.userId) return false;

    return this.sessions.delete(id);
  }

  async saveProfile(id: string, profile: DjProfileInput, userId?: string): Promise<DjProfile> {
    const stored: DjProfile = {
      id,
      ...(userId ? { userId } : {}),
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
