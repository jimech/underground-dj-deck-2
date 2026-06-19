import { DatabaseSessionStorage } from './databaseSessionStorage';
import { MemorySessionStorage } from './memorySessionStorage';
import type { SessionStorage } from './sessionStorage';

export interface SessionStorageStatus {
  configuredDriver: 'memory' | 'supabase';
  activeDriver: 'memory' | 'supabase';
  persistent: boolean;
}

function getConfiguredDriver(env: NodeJS.ProcessEnv): SessionStorageStatus['configuredDriver'] {
  return env.SESSION_STORAGE_DRIVER === 'supabase' ? 'supabase' : 'memory';
}

function createSessionStorage(env: NodeJS.ProcessEnv = process.env): { storage: SessionStorage; status: SessionStorageStatus } {
  const configuredDriver = getConfiguredDriver(env);

  if (configuredDriver === 'supabase') {
    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      return {
        storage: new DatabaseSessionStorage(supabaseUrl, serviceRoleKey),
        status: {
          configuredDriver,
          activeDriver: 'supabase',
          persistent: true,
        },
      };
    }

    console.warn('SESSION_STORAGE_DRIVER is "supabase", but Supabase credentials are missing. Falling back to memory storage.');
  }

  return {
    storage: new MemorySessionStorage(),
    status: {
      configuredDriver,
      activeDriver: 'memory',
      persistent: false,
    },
  };
}

const storageRuntime = createSessionStorage();

export const sessionStorage = storageRuntime.storage;
export const sessionStorageStatus = storageRuntime.status;
export type { SessionStorage, StoredSession } from './sessionStorage';
