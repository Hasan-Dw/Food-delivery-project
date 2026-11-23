import type {
  AccountStatus,
  AdminAnalytics,
  AdminAnalyticsQuery,
  Driver,
  User,
} from '@/types';
import type { ApiClient } from '@/services/api/client';
import type {
  AdminAccountQuery,
  AdminDriverQuery,
  AdminService,
} from './AdminService';

export class HttpAdminService implements AdminService {
  constructor(private readonly client: ApiClient) {}

  async getAnalytics(
    query: AdminAnalyticsQuery = { range: '30d' },
  ): Promise<AdminAnalytics> {
    const response = await this.client.get<AdminAnalytics>('/admin/analytics', {
      query: { range: query.range },
    });
    return response.data;
  }

  async listAccounts(query?: AdminAccountQuery): Promise<User[]> {
    const response = await this.client.get<User[]>('/admin/accounts', {
      query: {
        role: query?.role,
        accountStatus: query?.accountStatus,
      },
    });
    return response.data;
  }

  async listDrivers(query?: AdminDriverQuery): Promise<Driver[]> {
    const response = await this.client.get<Driver[]>('/admin/drivers', {
      query: { accountStatus: query?.accountStatus },
    });
    return response.data;
  }

  async updateAccountStatus(
    userId: string,
    status: AccountStatus,
    reason?: string,
  ): Promise<User> {
    const response = await this.client.patch<User>(
      `/admin/accounts/${encodeURIComponent(userId)}/status`,
      { status, reason },
    );
    return response.data;
  }
}
