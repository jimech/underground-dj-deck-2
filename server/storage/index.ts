import { DatabaseSessionStorage } from './databaseSessionStorage';
import { MemorySessionStorage } from './memorySessionStorage';
import type { SessionStorage } from './sessionStorage';

function createSessionStorage(): SessionStorage {
  if (process.env.SESSION_STORAGE_DRIVER === 'supabase') {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      return new DatabaseSessionStorage(supabaseUrl, serviceRoleKey);
    }

    console.warn('SESSION_STORAGE_DRIVER is "supabase", but Supabase credentials are missing. Falling back to memory storage.');
  }

  return new MemorySessionStorage();
}

export const sessionStorage = createSessionStorage();
export type { SessionStorage, StoredSession } from './sessionStorage';
