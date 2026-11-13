import type { UserRole } from '../../common/enums/user.enum';
import type { UserResponse } from '../../users/interfaces/user-response.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  accountStatus: string;
  iat?: number;
  exp?: number;
}

export interface AuthSessionResponse {
  accessToken: string;
  user: UserResponse;
  expiresAt: string;
}

export interface PasswordResetResponse {
  message: string;
}
