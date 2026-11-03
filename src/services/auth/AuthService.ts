import type { AuthSession, LoginCredentials, RegisterPayload } from '@/types';

export interface PasswordResetResult {
  /** Always generic so the UI never reveals whether an address exists. */
  message: string;
}

/**
 * Authentication contract. The mock implementation is intentionally obvious
 * about being a demo; a future HTTP implementation can replace it without any
 * page changing.
 */
export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  register(payload: RegisterPayload): Promise<AuthSession>;
  requestPasswordReset(email: string): Promise<PasswordResetResult>;
  getSession(): Promise<AuthSession | null>;
  logout(): Promise<void>;
}
