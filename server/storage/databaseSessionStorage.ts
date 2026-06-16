import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DjProfile, DjProfileInput } from '../../shared/profileSchema';
import type { VersionedSession } from '../../shared/sessionSchema';
import { cloneSession, type SessionStorage, type StoredSession } from './sessionStorage';

interface SessionRow {
  id: string;
  session: VersionedSession;
  created_at: string;
}

interface ProfileRow {
  id: string;
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

  async saveProfile(id: string, profile: DjProfileInput): Promise<DjProfile> {
    const { data, error } = await this.supabase
      .from('dj_profiles')
      .upsert({
        id,
        dj_name: profile.djName,
        dj_crew: profile.djCrew,
        sound_style: profile.soundStyle,
        avatar_index: profile.avatarIndex,
        time_mixed: profile.timeMixed,
        vinyl_spins: profile.vinylSpins,
        updated_at: new Date().toISOString(),
      })
      .select('id, dj_name, dj_crew, sound_style, avatar_index, time_mixed, vinyl_spins')
      .single<ProfileRow>();

    if (error) {
      throw new Error(`Failed to save Supabase profile: ${error.message}`);
    }

    return this.mapProfileRow(data);
  }

  async getProfile(id: string): Promise<DjProfile | null> {
    const { data, error } = await this.supabase
      .from('dj_profiles')
      .select('id, dj_name, dj_crew, sound_style, avatar_index, time_mixed, vinyl_spins')
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
    };
  }

  private mapProfileRow(row: ProfileRow): DjProfile {
    return {
      id: row.id,
      djName: row.dj_name,
      djCrew: row.dj_crew,
      soundStyle: row.sound_style,
      avatarIndex: row.avatar_index,
      timeMixed: row.time_mixed,
      vinylSpins: row.vinyl_spins,
    };
  }
}
