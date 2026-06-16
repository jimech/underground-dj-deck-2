import type { VersionedSession } from '../../shared/sessionSchema';
import type { DjProfile, DjProfileInput } from '../../shared/profileSchema';
import type { SessionNameRequest, SessionNameResponse } from '../../shared/aiSessionNameSchema';
import type { FlyerCopyRequest, FlyerCopyResponse } from '../../shared/aiFlyerCopySchema';
import { supabaseBrowserClient } from './supabaseClient';

const DEFAULT_API_BASE_URL = 'http://localhost:8787';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: string;
  detail?: string;
  status?: number;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface HealthResponse {
  ok: true;
  service: string;
}

export interface SessionResponse {
  id: string;
  shareUrl: string;
  createdAt: string;
  visibility: 'public' | 'private';
  session: VersionedSession;
}

export interface SessionListResponse {
  sessions: SessionResponse[];
}

export interface DeleteSessionResponse {
  deleted: true;
}

export interface ProfileResponse {
  profile: DjProfile;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getApiError(payload: unknown, fallback: string): Pick<ApiFailure, 'error' | 'detail'> {
  if (!payload || typeof payload !== 'object') {
    return { error: fallback };
  }

  const record = payload as Record<string, unknown>;
  return {
    error: typeof record.error === 'string' ? record.error : fallback,
    detail: typeof record.detail === 'string' ? record.detail : undefined,
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        ...getApiError(payload, 'Request failed'),
      };
    }

    return {
      ok: true,
      data: payload as T,
    };
  } catch (err) {
    return {
      ok: false,
      error: 'Network request failed',
      detail: err instanceof Error ? err.message : undefined,
    };
  }
}

async function getAuthToken(): Promise<string | null> {
  if (!supabaseBrowserClient) return null;

  const { data } = await supabaseBrowserClient.auth.getSession();
  return data.session?.access_token || null;
}

export function healthCheck(): Promise<ApiResult<HealthResponse>> {
  return requestJson<HealthResponse>('/api/health');
}

export function saveSession(session: VersionedSession): Promise<ApiResult<SessionResponse>> {
  return requestJson<SessionResponse>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });
}

export function getSession(id: string): Promise<ApiResult<SessionResponse>> {
  return requestJson<SessionResponse>(`/api/sessions/${encodeURIComponent(id)}`);
}

export function listSessions(): Promise<ApiResult<SessionListResponse>> {
  return requestJson<SessionListResponse>('/api/sessions');
}

export function updateSession(id: string, session: VersionedSession): Promise<ApiResult<SessionResponse>> {
  return requestJson<SessionResponse>(`/api/sessions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(session),
  });
}

export function deleteSession(id: string): Promise<ApiResult<DeleteSessionResponse>> {
  return requestJson<DeleteSessionResponse>(`/api/sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getProfile(id: string): Promise<ApiResult<ProfileResponse>> {
  return requestJson<ProfileResponse>(`/api/profiles/${encodeURIComponent(id)}`);
}

export function saveProfile(id: string, profile: DjProfileInput): Promise<ApiResult<ProfileResponse>> {
  return requestJson<ProfileResponse>(`/api/profiles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

export function generateSessionNames(input: SessionNameRequest): Promise<ApiResult<SessionNameResponse>> {
  return requestJson<SessionNameResponse>('/api/ai/session-name', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function generateFlyerCopy(input: FlyerCopyRequest): Promise<ApiResult<FlyerCopyResponse>> {
  return requestJson<FlyerCopyResponse>('/api/ai/flyer-copy', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
