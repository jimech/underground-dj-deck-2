import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const authClient = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export async function getAuthenticatedUser(authorizationHeader: string | undefined): Promise<AuthenticatedUser | null> {
  if (!authClient || !authorizationHeader?.startsWith('Bearer ')) return null;

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email,
  };
}

export function getUserProfileId(userId: string): string {
  return `user_${userId}`;
}
