import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marks a route as unauthenticated. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restricts a route to the listed platform roles. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const REQUIRE_APPROVED_KEY = 'requireApproved';
/** Requires an APPROVED account, independent of the endpoint's role list. */
export const RequireApproved = () => SetMetadata(REQUIRE_APPROVED_KEY, true);
