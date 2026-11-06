import type {
  AccountStatus,
  Driver,
  DriverAvailability,
  DriverLocation,
  DriverLocationInput,
  ID,
} from '@/types';

export interface DriverListQuery {
  accountStatus?: AccountStatus;
  availability?: DriverAvailability;
}

/**
 * Platform-owned driver operations. Restaurants never call this service to
 * manage drivers; assignment is handled by the delivery system.
 */
export interface DriverService {
  list(query?: DriverListQuery): Promise<Driver[]>;
  getById(driverId: string): Promise<Driver>;
  getByUserId(userId: ID): Promise<Driver>;
  setAvailability(driverId: string, availability: DriverAvailability): Promise<Driver>;
  getLocation(driverId: string): Promise<DriverLocation | null>;
  /** Driver app publishes the latest point; mocks use illustrative coordinates. */
  updateLocation(driverId: string, input: DriverLocationInput): Promise<DriverLocation>;
}
