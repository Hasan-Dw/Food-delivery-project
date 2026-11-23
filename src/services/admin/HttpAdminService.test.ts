import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/services/api/client';
import { HttpAdminService } from './HttpAdminService';

describe('HttpAdminService account status mutations', () => {
  it('sends only the status DTO fields for every supported account transition', async () => {
    const patch = vi.fn().mockResolvedValue({ data: { id: 'user-1' } });
    const client = { patch } as unknown as ApiClient;
    const service = new HttpAdminService(client);

    await service.updateAccountStatus('user-1', 'APPROVED', 'Verified');
    await service.updateAccountStatus('user-1', 'REJECTED', 'Incomplete documents');
    await service.updateAccountStatus('user-1', 'SUSPENDED', 'Policy violation');

    expect(patch).toHaveBeenCalledTimes(3);
    expect(patch).toHaveBeenNthCalledWith(
      1,
      '/admin/accounts/user-1/status',
      { status: 'APPROVED', reason: 'Verified' },
    );
    expect(patch).toHaveBeenNthCalledWith(
      2,
      '/admin/accounts/user-1/status',
      { status: 'REJECTED', reason: 'Incomplete documents' },
    );
    expect(patch).toHaveBeenNthCalledWith(
      3,
      '/admin/accounts/user-1/status',
      { status: 'SUSPENDED', reason: 'Policy violation' },
    );

    for (const [, body] of patch.mock.calls) {
      expect(body).not.toHaveProperty('actorId');
    }
  });
});
