import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VersionedSession } from '../../shared/sessionSchema';
import { cloneSession, type SessionStorage, type StoredSession } from './sessionStorage';

interface SessionRow {
  id: string;
  session: VersionedSession;
  created_at: string;
}

export class DatabaseSessionStorage implements SessionStorage {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async saveSession(session: VersionedSession): Promise<StoredSession> {
    const { data, error } = await this.supabase
      .from('dj_sessions')
      .insert({
        session: cloneSession(session),
      })
      .select('id, session, created_at')
      .single<SessionRow>();

    if (error) {
      throw new Error(`Failed to save Supabase session: ${error.message}`);
    }

    return this.mapRow(data);
  }

  async getSession(id: string): Promise<StoredSession | null> {
    const { data, error } = await this.supabase
      .from('dj_sessions')
      .select('id, session, created_at')
      .eq('id', id)
      .maybeSingle<SessionRow>();

    if (error) {
      throw new Error(`Failed to load Supabase session: ${error.message}`);
    }

    return data ? this.mapRow(data) : null;
  }

  private mapRow(row: SessionRow): StoredSession {
    return {
      id: row.id,
      session: cloneSession(row.session),
      createdAt: row.created_at,
    };
  }
}
