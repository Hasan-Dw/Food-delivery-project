import type {
  AccountStatus,
  AdminAnalytics,
  AdminAnalyticsQuery,
  Driver,
  User,
  UserRole,
} from '@/types';

export interface AdminAccountQuery {
  role?: UserRole;
  accountStatus?: AccountStatus;
}

export interface AdminDriverQuery {
  accountStatus?: AccountStatus;
}

/**
 * Platform administration. A real backend must authorize every call from an
 * admin token; this contract only describes the operations the UI needs.
 */
export interface AdminService {
  /** Platform-wide statistics derived from the database by the API. */
  getAnalytics(query?: AdminAnalyticsQuery): Promise<AdminAnalytics>;
  listAccounts(query?: AdminAccountQuery): Promise<User[]>;
  listDrivers(query?: AdminDriverQuery): Promise<Driver[]>;
  /** Approve, reject, suspend or reinstate an account. */
  updateAccountStatus(
    userId: string,
    status: AccountStatus,
    reason?: string,
  ): Promise<User>;
}
