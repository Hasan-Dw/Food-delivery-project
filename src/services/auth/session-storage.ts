import type { AuthSession } from '@/types';

const SESSION_KEY = 'savora.session';

interface StoredSession extends AuthSession {
  remember: boolean;
}

/**
 * Demo-session persistence. This is a frontend-only convenience and must not
 * be mistaken for secure authentication. A real backend should issue short
 * lived tokens (ideally httpOnly cookies) and own the session lifecycle.
 */
let cached: StoredSession | null | undefined;

function safeParse(value: string | null): StoredSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as StoredSession;
    if (!parsed.accessToken || !parsed.user || !parsed.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readAll(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  const persistent = safeParse(window.localStorage.getItem(SESSION_KEY));
  if (persistent) return persistent;
  const temporary = safeParse(window.sessionStorage.getItem(SESSION_KEY));
  return temporary;
}

export const sessionStorageBridge = {
  read(): StoredSession | null {
    if (cached === undefined) cached = readAll();
    return cached;
  },
  write(session: AuthSession, remember: boolean): void {
    cached = { ...session, remember };
    if (typeof window === 'undefined') return;
    const target = remember ? window.localStorage : window.sessionStorage;
    const other = remember ? window.sessionStorage : window.localStorage;
    other.removeItem(SESSION_KEY);
    target.setItem(SESSION_KEY, JSON.stringify(cached));
  },
  clear(): void {
    cached = null;
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  },
};

export type { StoredSession };
