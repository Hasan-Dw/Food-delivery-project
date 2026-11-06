import type { AccountStatus, Driver, User, UserRole } from '@/types';

export interface AdminAccountQuery {
  role?: UserRole;
  accountStatus?: AccountStatus;
}

export interface AdminDriverQuery {
  accountStatus?: AccountStatus;
}

/**
 * Actor context for audited admin mutations. Display-only: a real backend must
 * derive the administrator from the session token.
 */
export interface AdminMutationOptions {
  actorId?: string | null;
}

/**
 * Platform administration. A real backend must authorize every call from an
 * admin token; this contract only describes the operations the UI needs.
 */
export interface AdminService {
  listAccounts(query?: AdminAccountQuery): Promise<User[]>;
  listDrivers(query?: AdminDriverQuery): Promise<Driver[]>;
  /** Approve, reject, suspend or reinstate an account. */
  updateAccountStatus(
    userId: string,
    status: AccountStatus,
    reason?: string,
    options?: AdminMutationOptions,
  ): Promise<User>;
}
