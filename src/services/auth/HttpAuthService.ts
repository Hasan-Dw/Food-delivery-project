import type { AuthSession, LoginCredentials, RegisterPayload } from '@/types';
import { ApiError } from '@/services/api/errors';
import type { ApiClient } from '@/services/api/client';
import type { AuthService, PasswordResetResult } from './AuthService';
import { sessionStorageBridge, normaliseUser } from './session-storage';

export interface HttpAuthServiceOptions {
  storage?: typeof sessionStorageBridge;
}

/** Normalises the role/status enums before any page or guard reads them. */
function normaliseSession(session: AuthSession): AuthSession {
  return { ...session, user: normaliseUser(session.user) };
}

/**
 * HTTP implementation of the auth contract. Wired by the service factory when
 * `VITE_DATA_SOURCE=http` and a base URL are configured.
 */
export class HttpAuthService implements AuthService {
  constructor(
    private readonly client: ApiClient,
    private readonly options: HttpAuthServiceOptions = {},
  ) {}

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const response = await this.client.post<AuthSession>(
      '/auth/login',
      { email: credentials.email, password: credentials.password },
      { auth: false },
    );

    if (!response.data?.accessToken) {
      throw new ApiError({ code: 'invalid_session', message: 'The server returned an incomplete session.' }, 500);
    }

    const session = normaliseSession(response.data);
    (this.options.storage ?? sessionStorageBridge).write(session, credentials.remember);
    return session;
  }

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const response = await this.client.post<AuthSession>('/auth/register', payload, { auth: false });
    const session = normaliseSession(response.data);
    (this.options.storage ?? sessionStorageBridge).write(session, true);
    return session;
  }

  async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    const response = await this.client.post<{ message: string }>(
      '/auth/password-reset',
      { email },
      { auth: false },
    );
    return {
      message: response.data?.message ?? 'If that email is registered, a reset link is on its way.',
    };
  }

  async getSession(): Promise<AuthSession | null> {
    const stored = (this.options.storage ?? sessionStorageBridge).read();
    if (!stored) return null;
    try {
      const response = await this.client.get<AuthSession>('/auth/session');
      return response.data ? normaliseSession(response.data) : stored;
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      (this.options.storage ?? sessionStorageBridge).clear();
    }
  }
}
