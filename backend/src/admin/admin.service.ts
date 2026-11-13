import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AccountStatus, DriverAvailability, UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { DriversService } from '../drivers/drivers.service';
import type { DriverResponse } from '../drivers/interfaces/driver-response.interface';
import { User, type UserDocument } from '../users/schemas/user.schema';
import { DriverProfile, type DriverProfileDocument } from '../users/schemas/driver-profile.schema';
import { toUserResponse } from '../users/user.mapper';
import type { UserResponse } from '../users/interfaces/user-response.interface';
import type {
  AdminAccountQueryDto,
  AdminDriverQueryDto,
  UpdateAccountStatusDto,
} from './dto/admin.dto';

/**
 * Allowed account-status transitions. Re-applying the same status is a no-op;
 * arbitrary moves (for example APPROVED -> PENDING) are rejected so the
 * dashboard cannot invent an approval workflow the platform does not have.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<AccountStatus, readonly AccountStatus[]> = {
  [AccountStatus.PENDING_APPROVAL]: [AccountStatus.APPROVED, AccountStatus.REJECTED],
  [AccountStatus.APPROVED]: [AccountStatus.SUSPENDED],
  [AccountStatus.REJECTED]: [AccountStatus.APPROVED],
  [AccountStatus.SUSPENDED]: [AccountStatus.APPROVED],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(DriverProfile.name)
    private readonly driverModel: Model<DriverProfileDocument>,
    private readonly driversService: DriversService,
    private readonly deliveriesService: DeliveriesService,
  ) {}

  async listAccounts(query: AdminAccountQueryDto = {}): Promise<UserResponse[]> {
    const filter: FilterQuery<UserDocument> = {};

    if (query.role) filter.role = query.role;
    if (query.accountStatus) filter.accountStatus = query.accountStatus;
    if (query.search?.trim()) {
      const pattern = new RegExp(escapeRegExp(query.search.trim()), 'i');
      filter.$or = [{ fullName: pattern }, { email: pattern }];
    }

    const users = await this.userModel.find(filter).sort({ createdAt: -1 }).limit(500).exec();
    return users.map(toUserResponse);
  }

  async listDrivers(query: AdminDriverQueryDto = {}): Promise<DriverResponse[]> {
    return this.driversService.list({ accountStatus: query.accountStatus });
  }

  /**
   * Platform account decisions are always derived from the authenticated admin
   * token, never from an actor id supplied by the browser. Suspending or
   * rejecting a driver releases any active assignment without cancelling the
   * customer's order, matching the documented delivery rule.
   */
  async updateAccountStatus(
    actor: AuthenticatedUser,
    userId: string,
    dto: UpdateAccountStatusDto,
  ): Promise<UserResponse> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException({
        code: 'account_not_found',
        message: 'That account could not be found.',
      });
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException({
        code: 'account_not_found',
        message: 'That account could not be found.',
      });
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'admin_account_locked',
        message: 'Administrator accounts cannot be changed from the operations dashboard.',
      });
    }

    const current = user.accountStatus as AccountStatus;
    if (current === dto.status) {
      return toUserResponse(user);
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException({
        code: 'account_status_transition_not_allowed',
        message: `An account cannot move from ${current} to ${dto.status}.`,
      });
    }

    const reason = dto.reason?.trim();

    if (user.role === UserRole.DRIVER) {
      const driver = await this.driverModel.findOne({ userId: user._id }).exec();
      if (!driver) {
        throw new BadRequestException({
          code: 'driver_profile_missing',
          message: 'This driver account has no driver profile to update.',
        });
      }

      if (dto.status !== AccountStatus.APPROVED && driver.activeDeliveryId) {
        try {
          await this.deliveriesService.releaseAssignmentForAccountStatus(
            actor,
            driver.activeDeliveryId.toString(),
            reason ||
              `Driver account ${dto.status === AccountStatus.SUSPENDED ? 'suspended' : 'rejected'} by platform operations.`,
          );
        } catch (error) {
          // The account decision must still succeed; surface the assignment
          // problem in the log so operations can follow up manually.
          this.logger.warn(
            `Could not release delivery ${driver.activeDeliveryId.toString()} for driver ${driver._id.toString()}: ${(error as Error).message}`,
          );
        }
      }

      const driverUpdate: Record<string, unknown> = {
        accountStatus: dto.status,
        ...(dto.status === AccountStatus.APPROVED
          ? { approvedAt: new Date() }
          : {
              availability: DriverAvailability.OFFLINE,
              activeDeliveryId: null,
            }),
      };

      await this.driverModel.updateOne({ _id: driver._id }, { $set: driverUpdate }).exec();
    }

    user.accountStatus = dto.status;
    await user.save();

    this.logger.log(
      `Account ${user.email} moved from ${current} to ${dto.status} by admin ${actor.email}.`,
    );

    return toUserResponse(user);
  }
}
