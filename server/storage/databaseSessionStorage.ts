import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DjProfile, DjProfileInput } from '../../shared/profileSchema';
import type { VersionedSession } from '../../shared/sessionSchema';
import { cloneSession, type SessionStorage, type StoredSession } from './sessionStorage';

interface SessionRow {
  id: string;
  user_id: string | null;
  visibility: 'public' | 'private';
  session: VersionedSession;
  created_at: string;
}

interface ProfileRow {
  id: string;
  user_id: string | null;
  dj_name: string;
  dj_crew: string;
  sound_style: string;
  avatar_index: number;
  time_mixed: number;
  vinyl_spins: number;
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

  async saveSession(
    session: VersionedSession,
    options: { userId?: string; visibility?: 'public' | 'private' } = {},
  ): Promise<StoredSession> {
    const { data, error } = await this.supabase
      .from('dj_sessions')
      .insert({
        user_id: options.userId || null,
        visibility: options.visibility || 'public',
        session: cloneSession(session),
      })
      .select('id, user_id, visibility, session, created_at')
      .single<SessionRow>();

    if (error) {
      throw new Error(`Failed to save Supabase session: ${error.message}`);
    }

    return this.mapRow(data);
  }

  async getSession(id: string, options: { userId?: string } = {}): Promise<StoredSession | null> {
    const { data, error } = await this.supabase
      .from('dj_sessions')
      .select('id, user_id, visibility, session, created_at')
      .eq('id', id)
      .maybeSingle<SessionRow>();

    if (error) {
      throw new Error(`Failed to load Supabase session: ${error.message}`);
    }

    if (!data) return null;
    if (data.visibility === 'private' && data.user_id !== options.userId) return null;

    return this.mapRow(data);
  }

  async listSessions(options: { userId: string }): Promise<StoredSession[]> {
    const { data, error } = await this.supabase
      .from('dj_sessions')
      .select('id, user_id, visibility, session, created_at')
      .eq('user_id', options.userId)
      .order('created_at', { ascending: false })
      .returns<SessionRow[]>();

    if (error) {
      throw new Error(`Failed to list Supabase sessions: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRow(row));
  }

  async updateSession(id: string, session: VersionedSession, options: { userId: string }): Promise<StoredSession | null> {
    const { data, error } = await this.supabase
      .from('dj_sessions')
      .update({ session: cloneSession(session) })
      .eq('id', id)
      .eq('user_id', options.userId)
      .select('id, user_id, visibility, session, created_at')
      .maybeSingle<SessionRow>();

    if (error) {
      throw new Error(`Failed to update Supabase session: ${error.message}`);
    }

    return data ? this.mapRow(data) : null;
  }

  async deleteSession(id: string, options: { userId: string }): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('dj_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', options.userId)
      .select('id')
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error(`Failed to delete Supabase session: ${error.message}`);
    }

    return Boolean(data);
  }

  async saveProfile(id: string, profile: DjProfileInput, userId?: string): Promise<DjProfile> {
    const { data, error } = await this.supabase
      .from('dj_profiles')
      .upsert({
        id,
        user_id: userId || null,
        dj_name: profile.djName,
        dj_crew: profile.djCrew,
        sound_style: profile.soundStyle,
        avatar_index: profile.avatarIndex,
        time_mixed: profile.timeMixed,
        vinyl_spins: profile.vinylSpins,
        updated_at: new Date().toISOString(),
      })
      .select('id, user_id, dj_name, dj_crew, sound_style, avatar_index, time_mixed, vinyl_spins')
      .single<ProfileRow>();

    if (error) {
      throw new Error(`Failed to save Supabase profile: ${error.message}`);
    }

    return this.mapProfileRow(data);
  }

  async getProfile(id: string): Promise<DjProfile | null> {
    const { data, error } = await this.supabase
      .from('dj_profiles')
      .select('id, user_id, dj_name, dj_crew, sound_style, avatar_index, time_mixed, vinyl_spins')
      .eq('id', id)
      .maybeSingle<ProfileRow>();

    if (error) {
      throw new Error(`Failed to load Supabase profile: ${error.message}`);
    }

    return data ? this.mapProfileRow(data) : null;
  }

  private mapRow(row: SessionRow): StoredSession {
    return {
      id: row.id,
      session: cloneSession(row.session),
      createdAt: row.created_at,
      ...(row.user_id ? { userId: row.user_id } : {}),
      visibility: row.visibility,
    };
  }

  private mapProfileRow(row: ProfileRow): DjProfile {
    return {
      id: row.id,
      ...(row.user_id ? { userId: row.user_id } : {}),
      djName: row.dj_name,
      djCrew: row.dj_crew,
      soundStyle: row.sound_style,
      avatarIndex: row.avatar_index,
      timeMixed: row.time_mixed,
      vinylSpins: row.vinyl_spins,
    };
  }
}
