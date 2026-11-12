import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AccountStatus,
  PUBLIC_REGISTRATION_ROLES,
  UserRole,
} from '../common/enums/user.enum';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { toUserResponse } from '../users/user.mapper';
import type { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetDto, PasswordResetConfirmDto } from './dto/password-reset.dto';
import type { LoginDto } from './dto/login.dto';
import type {
  AuthSessionResponse,
  JwtPayload,
  PasswordResetResponse,
} from './interfaces/auth.interfaces';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const SESSION_FALLBACK_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly restaurantsService: RestaurantsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionResponse> {
    const role = (dto.role as UserRole | undefined) ?? UserRole.CUSTOMER;
    if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
      throw new BadRequestException({
        code: 'invalid_role',
        message: 'That account type cannot be self-selected.',
        details: { role: ['Choose customer, restaurant owner or driver.'] },
      });
    }

    if (role === UserRole.RESTAURANT_OWNER && !dto.restaurant) {
      throw new BadRequestException({
        code: 'validation_failed',
        message: 'Validation failed.',
        details: { restaurant: ['Restaurant details are required for this account type.'] },
      });
    }

    if (role === UserRole.DRIVER && !dto.driver) {
      throw new BadRequestException({
        code: 'validation_failed',
        message: 'Validation failed.',
        details: { driver: ['Driver details are required for this account type.'] },
      });
    }

    const accountStatus =
      role === UserRole.CUSTOMER
        ? AccountStatus.APPROVED
        : AccountStatus.PENDING_APPROVAL;

    const phone =
      dto.phone?.trim() ||
      dto.restaurant?.phone?.trim() ||
      dto.driver?.phone?.trim() ||
      '';

    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      phone,
      role,
      accountStatus,
    });

    if (role === UserRole.RESTAURANT_OWNER && dto.restaurant) {
      const restaurant = await this.restaurantsService.createForOwner(
        user._id.toString(),
        {
          name: dto.restaurant.name,
          tagline: dto.restaurant.description?.slice(0, 160),
          description: dto.restaurant.description,
          address: { line1: dto.restaurant.address },
        },
      );
      await this.usersService.attachRestaurant(user._id.toString(), restaurant.id);
    }

    if (role === UserRole.DRIVER && dto.driver) {
      await this.usersService.createDriverProfile(user._id.toString(), {
        phone: dto.driver.phone,
        serviceArea: dto.driver.serviceArea,
        vehicle: dto.driver.vehicle,
      });
    }

    const refreshed = await this.usersService.findById(user._id.toString());
    if (!refreshed) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'The account could not be loaded after registration.',
      });
    }

    return this.issueSession(refreshed);
  }

  async login(dto: LoginDto): Promise<AuthSessionResponse> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user || !(await this.usersService.verifyPassword(user, dto.password))) {
      throw new UnauthorizedException({
        code: 'invalid_credentials',
        message: 'Email or password is incorrect.',
      });
    }

    if (user.accountStatus === AccountStatus.REJECTED) {
      throw new ForbiddenException({
        code: 'account_rejected',
        message: 'This account was not approved. Contact support for more information.',
      });
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: 'account_suspended',
        message: 'This account is suspended and cannot sign in.',
      });
    }

    return this.issueSession(user);
  }

  async getSession(userId: string): Promise<AuthSessionResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Your session is no longer valid.',
      });
    }

    return this.issueSession(user);
  }

  async requestPasswordReset(dto: PasswordResetDto): Promise<PasswordResetResponse> {
    const message =
      'If that email address is registered, a reset link is on its way.';

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) return { message };

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.usersService.setPasswordResetToken(
      user._id.toString(),
      hashToken(token),
      expiresAt,
    );

    // No mail transport is configured in Phase 1. The token is written to the
    // server log only outside production so the flow can be completed in
    // development. See backend/docs/ARCHITECTURE.md.
    if (this.config.get<string>('nodeEnv') !== 'production') {
      this.logger.warn(
        `Password reset token for ${user.email}: ${token} (expires ${expiresAt.toISOString()})`,
      );
    }

    return { message };
  }

  async confirmPasswordReset(
    dto: PasswordResetConfirmDto,
  ): Promise<PasswordResetResponse> {
    const user = await this.usersService.findByPasswordResetTokenHash(
      hashToken(dto.token),
    );

    if (!user) {
      throw new BadRequestException({
        code: 'invalid_reset_token',
        message: 'That reset token is invalid or has expired.',
      });
    }

    await this.usersService.setPassword(user._id.toString(), dto.password);
    return { message: 'Your password has been updated. You can sign in now.' };
  }

  logout(): void {
    // Access tokens are stateless; the client removes its stored token.
  }

  private issueSession(user: UserDocument): AuthSessionResponse {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
      accountStatus: user.accountStatus,
    };

    const accessToken = this.jwtService.sign(payload);
    const decoded = this.jwtService.decode(accessToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + SESSION_FALLBACK_MS).toISOString();

    return {
      accessToken,
      user: toUserResponse(user),
      expiresAt,
    };
  }
}
