import type { AuthSession, User } from '@/types';
import { demoUser } from '@/mocks/data/user';
import { delay as wait } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { AuthService, PasswordResetResult } from '@/services/auth/AuthService';
import { sessionStorageBridge } from '@/services/auth/session-storage';

const SESSION_HOURS = { remembered: 24 * 7, session: 12 };

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

function createSession(user: User, remember: boolean): AuthSession {
  const hours = remember ? SESSION_HOURS.remembered : SESSION_HOURS.session;
  return {
    accessToken: `demo.${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    user,
    expiresAt: new Date(Date.now() + hours * 3_600_000).toISOString(),
  };
}

interface DemoAccount {
  user: User;
  password: string;
}

/**
 * DEMO AUTHENTICATION — NOT SECURE.
 *
 * Accounts are held in memory for the duration of the tab. Passwords are
 * compared in plain text purely to make the prototype explorable. When the
 * backend lands, delete this file from the service factory; nothing in the UI
 * changes.
 */
export class MockAuthService implements AuthService {
  private accounts = new Map<string, DemoAccount>([
    [normaliseEmail(demoUser.email), { user: demoUser, password: 'Savora123!' }],
  ]);

  async login({ email, password, remember }: Parameters<AuthService['login']>[0]): Promise<AuthSession> {
    await wait(850);
    const account = this.accounts.get(normaliseEmail(email));

    if (!account || account.password !== password) {
      throw new ApiError(
        {
          code: 'invalid_credentials',
          message: 'That email and password do not match. Try the demo account below.',
        },
        401,
      );
    }

    const session = createSession(account.user, remember);
    sessionStorageBridge.write(session, remember);
    return session;
  }

  async register(payload: Parameters<AuthService['register']>[0]): Promise<AuthSession> {
    await wait(1000);
    const email = normaliseEmail(payload.email);

    if (this.accounts.has(email)) {
      throw new ApiError(
        {
          code: 'email_taken',
          message: 'An account with this email already exists. Try signing in instead.',
          details: { email: ['This email is already registered.'] },
        },
        409,
      );
    }

    const user: User = {
      id: `usr_${Date.now().toString(36)}`,
      fullName: payload.fullName.trim(),
      email,
      phone: '',
      memberSince: new Date().toISOString(),
      role: 'customer',
      preferences: {
        dietary: [],
        emailReceipts: true,
        orderUpdates: true,
        marketing: false,
      },
    };

    this.accounts.set(email, { user, password: payload.password });
    const session = createSession(user, true);
    sessionStorageBridge.write(session, true);
    return session;
  }

  async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    await wait(900);
    // Deliberately generic: never disclose whether the address exists.
    if (!normaliseEmail(email).includes('@')) {
      throw new ApiError({ code: 'invalid_email', message: 'Enter a valid email address.' }, 422);
    }
    return {
      message: 'If that email is registered with Savora, a reset link is on its way. It expires in 30 minutes.',
    };
  }

  async getSession(): Promise<AuthSession | null> {
    const stored = sessionStorageBridge.read();
    if (!stored) return null;
    const { remember: _remember, ...session } = stored;
    return session;
  }

  async logout(): Promise<void> {
    await wait(180);
    sessionStorageBridge.clear();
  }
}
