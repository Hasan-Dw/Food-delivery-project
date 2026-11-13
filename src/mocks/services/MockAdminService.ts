import type { AccountStatus, Driver, User } from '@/types';
import { accounts, findAccountByUserId } from '@/mocks/data/accounts';
import { deliveries } from '@/mocks/data/deliveries';
import { drivers } from '@/mocks/data/drivers';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import { sessionStorageBridge } from '@/services/auth/session-storage';
import type {
  AdminAccountQuery,
  AdminDriverQuery,
  AdminMutationOptions,
  AdminService,
} from '@/services/admin/AdminService';
import {
  clearAssignmentFields,
  pushAssignmentEvent,
  releaseDriver,
} from '@/mocks/services/delivery-store';
import { retryPendingAssignmentsForDriver } from '@/mocks/services/assignment-engine';

/**
 * Allowed account-status transitions. Re-applying the same status is treated
 * as a no-op by the caller; arbitrary moves such as APPROVED → PENDING are
 * rejected so the UI cannot invent an approval workflow.
 */
const allowedStatusTransitions: Record<AccountStatus, readonly AccountStatus[]> = {
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUSPENDED'],
  REJECTED: ['APPROVED'],
  SUSPENDED: ['APPROVED'],
};

/**
 * Suspending or rejecting a driver must never leave an active delivery
 * stranded. Release the driver and return the delivery to the assignment pool;
 * the customer's order remains active.
 *
 * This is an exceptional platform action, not the normal unassign flow: it can
 * also fire while the driver is in transit. The audit row records that it was
 * caused by an account-status change.
 */
function releaseActiveDelivery(
  driver: Driver,
  status: AccountStatus,
  reason: string | undefined,
  options: AdminMutationOptions,
): void {
  const delivery = driver.activeDeliveryId
    ? deliveries.find((entry) => entry.id === driver.activeDeliveryId)
    : undefined;

  if (!delivery) {
    driver.activeDeliveryId = null;
    driver.availability = 'OFFLINE';
    return;
  }

  const released = releaseDriver(delivery);
  clearAssignmentFields(delivery);
  pushAssignmentEvent(delivery, {
    action: 'UNASSIGNED',
    source: 'MANUAL',
    previousDriver: released ?? driver,
    adminId: options.actorId ?? null,
    reason:
      reason?.trim() ||
      `Driver account ${status === 'SUSPENDED' ? 'suspended' : 'rejected'} by platform operations.`,
  });

  driver.activeDeliveryId = null;
  driver.availability = 'OFFLINE';
}

/**
 * Demo platform administration. Approving or rejecting a driver keeps the
 * linked driver profile in step so assignment rules immediately reflect the
 * decision. A real backend must derive the actor from an admin token.
 */
export class MockAdminService implements AdminService {
  async listAccounts(query?: AdminAccountQuery): Promise<User[]> {
    await delay(300);
    return accounts
      .map((account) => account.user)
      .filter((user) => {
        if (query?.role && user.role !== query.role) return false;
        if (query?.accountStatus && user.accountStatus !== query.accountStatus) return false;
        return true;
      });
  }

  async listDrivers(query?: AdminDriverQuery): Promise<Driver[]> {
    await delay(280);
    return drivers.filter((driver) => {
      if (query?.accountStatus && driver.accountStatus !== query.accountStatus) return false;
      return true;
    });
  }

  async updateAccountStatus(
    userId: string,
    status: AccountStatus,
    reason?: string,
    options: AdminMutationOptions = {},
  ): Promise<User> {
    await delay(420);
    const account = findAccountByUserId(userId);
    if (!account) {
      throw new ApiError({ code: 'account_not_found', message: 'Account not found.' }, 404);
    }

    if (account.user.role === 'ADMIN') {
      throw new ApiError(
        {
          code: 'admin_account_locked',
          message: 'Administrator accounts cannot be changed from the operations dashboard.',
        },
        403,
      );
    }

    const current = account.user.accountStatus;
    if (current === status) return account.user;

    if (!allowedStatusTransitions[current].includes(status)) {
      throw new ApiError(
        {
          code: 'invalid_account_transition',
          message: `An account in ${current} cannot transition to ${status}.`,
        },
        409,
      );
    }

    account.user = { ...account.user, accountStatus: status };

    if (account.user.role === 'DRIVER') {
      const driver = drivers.find((entry) => entry.userId === userId);
      if (driver) {
        driver.accountStatus = status;
        if (status !== 'APPROVED') {
          releaseActiveDelivery(driver, status, reason, options);
        } else if (driver.availability === 'ON_DELIVERY' && !driver.activeDeliveryId) {
          driver.availability = 'OFFLINE';
        }
        if (driver.availability === 'AVAILABLE') {
          retryPendingAssignmentsForDriver(driver.id);
        }
      }
    }

    const session = sessionStorageBridge.read();
    if (session?.user.id === account.user.id) {
      sessionStorageBridge.write(
        { accessToken: session.accessToken, user: account.user, expiresAt: session.expiresAt },
        session.remember,
      );
    }

    return account.user;
  }
}
