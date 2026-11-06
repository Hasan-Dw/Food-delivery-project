import type { AccountStatus, Driver, User } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type {
  AdminAccountQuery,
  AdminDriverQuery,
  AdminMutationOptions,
  AdminService,
} from './AdminService';

export class HttpAdminService implements AdminService {
  constructor(private readonly client: ApiClient) {}

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
    options: AdminMutationOptions = {},
  ): Promise<User> {
    const response = await this.client.patch<User>(
      `/admin/accounts/${encodeURIComponent(userId)}/status`,
      { status, reason, actorId: options.actorId ?? undefined },
    );
    return response.data;
  }
}
