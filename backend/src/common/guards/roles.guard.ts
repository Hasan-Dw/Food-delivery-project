import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/auth.decorators';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';

/** Enforces the `@Roles(...)` decorator against the authenticated user. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Authentication is required.',
      });
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Your account does not have permission to perform this action.',
      });
    }

    return true;
  }
}
