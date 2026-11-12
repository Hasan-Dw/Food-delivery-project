import { AccountStatus, UserRole } from '../enums/user.enum';

/** Identity attached to an authenticated request by the JWT strategy. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  restaurantId?: string;
  driverId?: string;
}
