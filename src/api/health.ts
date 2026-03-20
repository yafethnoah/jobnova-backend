import { apiRequest } from '@/src/api/client';
import { env } from '@/src/lib/env';

export type BackendHealth = {
  ok: boolean;
  status: 'healthy' | 'degraded' | 'fallback' | 'down';
  service: string;
  version?: string;
  timestamp?: string;
  db?: { ok?: boolean; enabled?: boolean; mode?: string; reason?: string; message?: string };
  redis?: { ok?: boolean; enabled?: boolean; mode?: string; reason?: string; message?: string };
  supabase?: { ok?: boolean; enabled?: boolean; mode?: string; reason?: string };
  openai?: { ok?: boolean; mode?: string; message?: string };
  email?: { ok?: boolean; mode?: string; message?: string };
  exports?: { ok?: boolean; mode?: string; message?: string };
  persistenceMode?: string;
  warnings?: string[];
  queueDepth?: number;
};

function mockHealth(message = 'App is running in mock mode.'): BackendHealth {
  return {
    ok: true,
    status: 'fallback',
    service: 'jobnova-backend',
    version: 'mock-mode',
    timestamp: new Date().toISOString(),
    db: { ok: true, enabled: true, mode: 'mock' },
    redis: { ok: true, enabled: true, mode: 'mock' },
    supabase: { ok: false, enabled: false, mode: 'not-configured' },
    openai: { ok: false, mode: 'not-configured', message: 'AI voice and live rewriting will use fallback behavior until OPENAI_API_KEY is configured.' },
    email: { ok: false, mode: 'not-configured' },
    exports: { ok: true, mode: 'mock-local' },
    persistenceMode: 'mock',
    warnings: [message],
    queueDepth: 0
  };
}

function downHealth(message: string): BackendHealth {
  return {
    ok: false,
    status: 'down',
    service: 'jobnova-backend',
    version: 'unreachable',
    timestamp: new Date().toISOString(),
    db: { ok: false, enabled: true, mode: 'unknown', message },
    redis: { ok: false, enabled: false, mode: 'unknown' },
    supabase: { ok: false, enabled: false, mode: 'unknown' },
    exports: { ok: false, mode: 'unknown', message },
    warnings: [message],
    queueDepth: 0
  };
}

export const healthApi = {
  async getBackendHealth() {
    if (env.useMockApi) return mockHealth();

    try {
      return await apiRequest<BackendHealth>('/health', { timeoutMs: 6000 });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'The backend is unreachable. Check EXPO_PUBLIC_API_BASE_URL and confirm the server is running.';
      return downHealth(message);
    }
  }
};
