import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AccountStatus, DriverAvailability, UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Delivery } from '../deliveries/schemas/delivery.schema';
import { User, type UserDocument } from '../users/schemas/user.schema';
import {
  DriverProfile,
  type DriverProfileDocument,
} from '../users/schemas/driver-profile.schema';
import type { DriverQueryDto, DriverLocationDto } from './dto/driver.dto';
import {
  toDriverLocationResponse,
  toDriverResponse,
  type DriverLocationResponse,
  type DriverResponse,
} from './interfaces/driver-response.interface';

const AVAILABILITY_TRANSITIONS: Record<DriverAvailability, readonly DriverAvailability[]> = {
  [DriverAvailability.OFFLINE]: [DriverAvailability.AVAILABLE],
  [DriverAvailability.AVAILABLE]: [
    DriverAvailability.OFFLINE,
    DriverAvailability.ON_DELIVERY,
  ],
  [DriverAvailability.ON_DELIVERY]: [DriverAvailability.AVAILABLE],
};

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(DriverProfile.name)
    private readonly driverModel: Model<DriverProfileDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Delivery.name)
    private readonly deliveryModel: Model<Delivery>,
  ) {}

  async list(query: DriverQueryDto = {}): Promise<DriverResponse[]> {
    const filter: FilterQuery<DriverProfileDocument> = {};
    if (query.accountStatus) filter.accountStatus = query.accountStatus;
    if (query.availability) filter.availability = query.availability;

    const drivers = await this.driverModel.find(filter).sort({ createdAt: -1 }).limit(200).exec();
    const users = await this.userModel
      .find({ _id: { $in: drivers.map((driver) => driver.userId) } })
      .exec();
    const byId = new Map(users.map((user) => [user._id.toString(), user]));

    return drivers
      .map((driver) => {
        const user = byId.get(driver.userId.toString());
        return user ? toDriverResponse(driver, user) : null;
      })
      .filter((driver): driver is DriverResponse => Boolean(driver));
  }

  async getById(actor: AuthenticatedUser, driverId: string): Promise<DriverResponse> {
    const driver = await this.getDocument(driverId);
    this.assertSelfOrAdmin(actor, driver);
    return this.toResponse(driver);
  }

  async getByUserId(actor: AuthenticatedUser, userId: string): Promise<DriverResponse> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException({
        code: 'driver_not_found',
        message: 'No driver profile exists for this account.',
      });
    }

    const driver = await this.driverModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (!driver) {
      throw new NotFoundException({
        code: 'driver_not_found',
        message: 'No driver profile exists for this account.',
      });
    }

    if (actor.role !== UserRole.ADMIN && actor.id !== driver.userId.toString()) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'You can only view your own driver profile.',
      });
    }

    return this.toResponse(driver);
  }

  async setAvailability(
    actor: AuthenticatedUser,
    driverId: string,
    availability: DriverAvailability,
  ): Promise<DriverResponse> {
    const driver = await this.getDocument(driverId);
    this.assertSelfOrAdmin(actor, driver);

    if (availability === DriverAvailability.ON_DELIVERY) {
      throw new ConflictException({
        code: 'assignment_managed_by_platform',
        message: 'On-delivery status is managed by the platform when a delivery is assigned.',
      });
    }

    if (driver.availability === availability) {
      return this.toResponse(driver);
    }

    if (driver.accountStatus !== AccountStatus.APPROVED) {
      throw new ForbiddenException({
        code: 'driver_not_approved',
        message: 'Your driver account must be approved before changing availability.',
      });
    }

    const allowed = AVAILABILITY_TRANSITIONS[driver.availability as DriverAvailability] ?? [];
    if (!allowed.includes(availability)) {
      throw new ConflictException({
        code: 'invalid_availability_transition',
        message: `${driver.availability} cannot transition to ${availability}.`,
      });
    }

    if (availability !== DriverAvailability.AVAILABLE && driver.activeDeliveryId) {
      throw new ConflictException({
        code: 'active_delivery_exists',
        message: 'Finish the active delivery before going offline.',
      });
    }

    const updated = await this.driverModel
      .findOneAndUpdate(
        {
          _id: driver._id,
          availability: driver.availability,
          activeDeliveryId: null,
        },
        { $set: { availability } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException({
        code: 'availability_conflict',
        message: 'Your availability changed while the request was being processed. Try again.',
      });
    }

    return this.toResponse(updated);
  }

  async getLocation(
    actor: AuthenticatedUser,
    driverId: string,
  ): Promise<DriverLocationResponse | null> {
    const driver = await this.getDocument(driverId);
    this.assertSelfOrAdmin(actor, driver);
    return toDriverLocationResponse(driver);
  }

  async updateLocation(
    actor: AuthenticatedUser,
    driverId: string,
    input: DriverLocationDto,
  ): Promise<DriverLocationResponse> {
    const driver = await this.getDocument(driverId);
    this.assertSelfOrAdmin(actor, driver);

    if (driver.accountStatus !== AccountStatus.APPROVED) {
      throw new ForbiddenException({
        code: 'driver_not_approved',
        message: 'Only an approved driver can publish a location.',
      });
    }

    const updatedAt = new Date();
    const location = {
      lat: input.lat,
      lng: input.lng,
      heading: input.heading,
      speedKph: input.speedKph,
      updatedAt,
    };

    await this.driverModel
      .updateOne({ _id: driver._id }, { $set: { lastLocation: location } })
      .exec();

    if (driver.activeDeliveryId) {
      await this.deliveryModel
        .updateOne(
          { _id: driver.activeDeliveryId, driverId: driver._id },
          {
            $set: {
              driverLocation: location,
              updatedAt,
            },
          },
        )
        .exec();
    }

    return {
      driverId: driver._id.toString(),
      ...(driver.activeDeliveryId ? { deliveryId: driver.activeDeliveryId.toString() } : {}),
      lat: input.lat,
      lng: input.lng,
      ...(input.heading !== undefined ? { heading: input.heading } : {}),
      ...(input.speedKph !== undefined ? { speedKph: input.speedKph } : {}),
      updatedAt: updatedAt.toISOString(),
    };
  }

  /** Internal lookup used by delivery assignment and tracking. */
  async getDocument(driverId: string): Promise<DriverProfileDocument> {
    if (!Types.ObjectId.isValid(driverId)) {
      throw new NotFoundException({
        code: 'driver_not_found',
        message: 'That driver could not be found.',
      });
    }

    const driver = await this.driverModel.findById(driverId).exec();
    if (!driver) {
      throw new NotFoundException({
        code: 'driver_not_found',
        message: 'That driver could not be found.',
      });
    }
    return driver;
  }

  private async toResponse(driver: DriverProfileDocument): Promise<DriverResponse> {
    const user = await this.userModel.findById(driver.userId).exec();
    if (!user) {
      throw new NotFoundException({
        code: 'driver_not_found',
        message: 'The account for this driver no longer exists.',
      });
    }
    return toDriverResponse(driver, user);
  }

  private assertSelfOrAdmin(
    actor: AuthenticatedUser,
    driver: DriverProfileDocument,
  ): void {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.driverId === driver._id.toString()) return;

    throw new ForbiddenException({
      code: 'forbidden',
      message: 'You can only manage your own driver profile.',
    });
  }
}
