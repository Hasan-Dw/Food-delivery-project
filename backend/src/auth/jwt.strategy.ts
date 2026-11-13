import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AccountStatus,
  UserRole,
} from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './interfaces/auth.interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwtAccessSecret'),
    });
  }

  /**
   * Reloads the user on every request so a role change or suspension takes
   * effect immediately instead of waiting for the token to expire.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Your session is no longer valid.',
      });
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: 'account_suspended',
        message: 'This account is suspended.',
      });
    }

    if (user.accountStatus === AccountStatus.REJECTED) {
      throw new ForbiddenException({
        code: 'account_rejected',
        message: 'This account was not approved.',
      });
    }

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
      accountStatus: user.accountStatus as AccountStatus,
      restaurantId: user.restaurantId?.toString(),
      driverId: user.driverId?.toString(),
    };
  }
}
