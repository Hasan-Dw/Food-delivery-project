import bcrypt from 'bcrypt';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AccountStatus,
  UserRole,
  VehicleType,
} from '../common/enums/user.enum';
import { UploadsService } from '../uploads/uploads.service';
import type { UploadedImageFile } from '../uploads/image-file.util';
import type { AddressInputDto } from './dto/address.dto';import type { PreferencesDto, UpdatePreferencesDto, UpdateProfileDto } from './dto/preferences.dto';
import type { AddressResponse, PaymentMethodResponse, UserResponse } from './interfaces/user-response.interface';
import { DriverProfile, type DriverProfileDocument } from './schemas/driver-profile.schema';
import { User, type Address, type UserDocument } from './schemas/user.schema';
import {
  toAddressResponse,
  toPaymentMethodResponse,
  toUserResponse,
} from './user.mapper';

const BCRYPT_ROUNDS = 12;

export interface CreateUserPreferences {
  dietary?: string[];
  emailReceipts?: boolean;
  orderUpdates?: boolean;
  marketing?: boolean;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  preferences?: CreateUserPreferences;
}

export interface DriverApplicationInput {
  phone: string;
  serviceArea: string;
  vehicle: VehicleType;
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(DriverProfile.name)
    private readonly driverModel: Model<DriverProfileDocument>,
    private readonly uploads: UploadsService,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    const email = normaliseEmail(input.email);
    const existing = await this.userModel.exists({ email });
    if (existing) {
      throw new ConflictException({
        code: 'email_taken',
        message: 'That email address is already registered.',
        details: { email: ['Already in use.'] },
      });
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    return this.userModel.create({
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() ?? '',
      role: input.role,
      accountStatus: input.accountStatus,
      preferences: {
        dietary: input.preferences?.dietary ?? [],
        emailReceipts: input.preferences?.emailReceipts ?? true,
        orderUpdates: input.preferences?.orderUpdates ?? true,
        marketing: input.preferences?.marketing ?? false,
      },
    });
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: normaliseEmail(email) }).exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: normaliseEmail(email) })
      .select('+passwordHash')
      .exec();
  }

  async verifyPassword(user: UserDocument, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  async getProfile(id: string): Promise<UserResponse> {
    return toUserResponse(await this.getUserDocument(id));
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserResponse> {
    const user = await this.getUserDocument(id);

    if (dto.email !== undefined && normaliseEmail(dto.email) !== user.email) {
      const email = normaliseEmail(dto.email);
      const existing = await this.userModel.exists({ email, _id: { $ne: user._id } });
      if (existing) {
        throw new ConflictException({
          code: 'email_taken',
          message: 'That email address is already registered.',
          details: { email: ['Already in use.'] },
        });
      }
      user.email = email;
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone.trim();
    if (dto.avatarKey !== undefined) user.avatarKey = dto.avatarKey;
    if (dto.preferences !== undefined) {
      this.applyPreferences(user, dto.preferences);
    }

    await user.save();
    return toUserResponse(user);
  }

  async updatePreferences(
    id: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserResponse> {
    const user = await this.getUserDocument(id);
    this.applyPreferences(user, dto);
    await user.save();
    return toUserResponse(user);
  }

  /**
   * Uploads or replaces the authenticated user's profile image. The previous
   * Cloudinary asset is deleted only after the new URL is persisted.
   */
  async updateProfileImage(
    id: string,
    file: UploadedImageFile | undefined,
  ): Promise<UserResponse> {
    const user = await this.getUserDocument(id);
    const stored = await this.uploads.store(file, {
      folder: `users/user-${this.uploads.safeId(id)}`,
      name: 'profile',
    });
    const previous = user.avatarPublicId;

    try {
      user.avatarKey = stored.url;
      user.avatarPublicId = stored.publicId;
      await user.save();
    } catch (error) {
      await this.uploads.discard(stored.publicId);
      throw error;
    }

    await this.uploads.discard(previous);
    return toUserResponse(user);
  }

  async removeProfileImage(id: string): Promise<UserResponse> {
    const user = await this.getUserDocument(id);
    const previous = user.avatarPublicId;

    user.avatarKey = undefined;
    user.avatarPublicId = undefined;
    await user.save();

    await this.uploads.discard(previous);
    return toUserResponse(user);
  }

  async listAddresses(id: string): Promise<AddressResponse[]> {
    const user = await this.getUserDocument(id);
    return (user.addresses ?? []).map(toAddressResponse);
  }

  async createAddress(id: string, dto: AddressInputDto): Promise<AddressResponse> {
    const user = await this.getUserDocument(id);
    const address = { ...dto } as unknown as Address;
    const shouldBeDefault = dto.isDefault === true || (user.addresses ?? []).length === 0;

    if (shouldBeDefault) {
      for (const existing of user.addresses ?? []) existing.isDefault = false;
    }
    address.isDefault = shouldBeDefault;

    user.addresses = [...(user.addresses ?? []), address];
    await user.save();

    const created = user.addresses[user.addresses.length - 1];
    return toAddressResponse(created);
  }

  async updateAddress(
    id: string,
    addressId: string,
    dto: AddressInputDto,
  ): Promise<AddressResponse> {
    const user = await this.getUserDocument(id);
    const address = (user.addresses ?? []).find(
      (entry) => String((entry as unknown as { _id: Types.ObjectId })._id) === addressId,
    );

    if (!address) {
      throw new NotFoundException({
        code: 'address_not_found',
        message: 'That address could not be found.',
      });
    }

    if (dto.isDefault === true) {
      for (const existing of user.addresses ?? []) existing.isDefault = false;
    }

    address.label = dto.label;
    address.line1 = dto.line1;
    address.line2 = dto.line2;
    address.city = dto.city;
    address.state = dto.state;
    address.postalCode = dto.postalCode;
    address.country = dto.country;
    address.instructions = dto.instructions;
    address.isDefault = dto.isDefault ?? address.isDefault;
    if (dto.coordinates) {
      address.coordinates = { lat: dto.coordinates.lat, lng: dto.coordinates.lng };
    }

    await user.save();
    return toAddressResponse(address);
  }

  async deleteAddress(id: string, addressId: string): Promise<void> {
    const user = await this.getUserDocument(id);
    const existing = (user.addresses ?? []).find(
      (entry) => String((entry as unknown as { _id: Types.ObjectId })._id) === addressId,
    );

    if (!existing) {
      throw new NotFoundException({
        code: 'address_not_found',
        message: 'That address could not be found.',
      });
    }

    const wasDefault = existing.isDefault;
    user.addresses = (user.addresses ?? []).filter(
      (entry) => String((entry as unknown as { _id: Types.ObjectId })._id) !== addressId,
    );

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
  }

  async setDefaultAddress(id: string, addressId: string): Promise<AddressResponse[]> {
    const user = await this.getUserDocument(id);
    const target = (user.addresses ?? []).find(
      (entry) => String((entry as unknown as { _id: Types.ObjectId })._id) === addressId,
    );

    if (!target) {
      throw new NotFoundException({
        code: 'address_not_found',
        message: 'That address could not be found.',
      });
    }

    for (const address of user.addresses ?? []) {
      address.isDefault = String((address as unknown as { _id: Types.ObjectId })._id) === addressId;
    }

    await user.save();
    return user.addresses.map(toAddressResponse);
  }

  async listPaymentMethods(id: string): Promise<PaymentMethodResponse[]> {
    const user = await this.getUserDocument(id);
    return (user.paymentMethods ?? []).map(toPaymentMethodResponse);
  }

  async createDriverProfile(
    userId: string,
    application: DriverApplicationInput,
  ): Promise<DriverProfileDocument> {
    const driver = await this.driverModel.create({
      userId: new Types.ObjectId(userId),
      vehicle: application.vehicle,
      serviceArea: application.serviceArea.trim(),
      phone: application.phone?.trim() ?? '',
      accountStatus: AccountStatus.PENDING_APPROVAL,
    });

    await this.userModel
      .updateOne({ _id: userId }, { $set: { driverId: driver._id } })
      .exec();

    return driver;
  }

  async attachRestaurant(userId: string, restaurantId: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId, restaurantId: { $exists: false } },
        { $set: { restaurantId: new Types.ObjectId(restaurantId) } },
      )
      .exec();
  }

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        { $set: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt } },
      )
      .exec();
  }

  async findByPasswordResetTokenHash(tokenHash: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt')
      .exec();
  }

  async setPassword(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.userModel
      .updateOne(
        { _id: userId },
        {
          $set: { passwordHash },
          $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
        },
      )
      .exec();
  }

  private applyPreferences(user: UserDocument, preferences: PreferencesDto): void {
    if (preferences.dietary !== undefined) user.preferences.dietary = preferences.dietary;
    if (preferences.emailReceipts !== undefined) {
      user.preferences.emailReceipts = preferences.emailReceipts;
    }
    if (preferences.orderUpdates !== undefined) {
      user.preferences.orderUpdates = preferences.orderUpdates;
    }
    if (preferences.marketing !== undefined) user.preferences.marketing = preferences.marketing;
  }

  private async getUserDocument(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException({
        code: 'user_not_found',
        message: 'That account could not be found.',
      });
    }
    return user;
  }
}
