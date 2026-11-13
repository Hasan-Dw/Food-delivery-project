import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_APPROVED_KEY } from '../decorators/auth.decorators';
import { AccountStatus } from '../enums/user.enum';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';

/**
 * Blocks operational endpoints until an account has been approved. Pending
 * restaurant owners and drivers can still read their own profile so the UI can
 * explain the approval state.
 */
@Injectable()
export class ApprovedAccountGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireApproved = this.reflector.getAllAndOverride<boolean>(REQUIRE_APPROVED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireApproved) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Authentication is required.',
      });
    }

    if (user.accountStatus !== AccountStatus.APPROVED) {
      throw new ForbiddenException({
        code: 'account_not_approved',
        message: 'Your account is awaiting approval before this action is available.',
      });
    }

    return true;
  }
}
