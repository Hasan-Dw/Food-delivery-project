import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import { authToken, onUnauthorized } from '@/services/api';
import { sessionStorageBridge } from '@/services/auth/session-storage';
import type { AuthSession, LoginCredentials, RegisterPayload, User } from '@/types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  signIn: (credentials: LoginCredentials) => Promise<AuthSession>;
  signUp: (payload: RegisterPayload) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  updateUser: (user: User) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Authentication boundary.
 *
 * The provider owns session lifecycle, storage hydration and 401 handling. It
 * talks only to `AuthService`; swapping mock auth for the backend requires no
 * changes here or in any page. Frontend-only sessions are **not** secure auth.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const queryClient = useQueryClient();

  const applySession = useCallback((session: AuthSession | null) => {
    if (session) {
      authToken.set(session.accessToken);
      setUser(session.user);
      setStatus('authenticated');
    } else {
      authToken.clear();
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const stored = sessionStorageBridge.read();
    if (stored) authToken.set(stored.accessToken);

    services.auth
      .getSession()
      .then((session) => {
        if (!cancelled) applySession(session);
      })
      .catch(() => {
        if (!cancelled) applySession(null);
      });

    const unsubscribe = onUnauthorized(() => {
      authToken.clear();
      sessionStorageBridge.clear();
      setUser(null);
      setStatus('anonymous');
      queryClient.clear();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [applySession, queryClient]);

  const signIn = useCallback(
    async (credentials: LoginCredentials) => {
      const session = await services.auth.login(credentials);
      applySession(session);
      queryClient.clear();
      return session;
    },
    [applySession, queryClient],
  );

  const signUp = useCallback(
    async (payload: RegisterPayload) => {
      const session = await services.auth.register(payload);
      applySession(session);
      queryClient.clear();
      return session;
    },
    [applySession, queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await services.auth.logout();
    } finally {
      applySession(null);
      queryClient.clear();
    }
  }, [applySession, queryClient]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const result = await services.auth.requestPasswordReset(email);
    return result.message;
  }, []);

  const refresh = useCallback(async () => {
    const session = await services.auth.getSession();
    applySession(session);
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updateUser: setUser,
      refresh,
    }),
    [user, status, signIn, signUp, signOut, requestPasswordReset, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
