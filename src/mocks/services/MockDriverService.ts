import type {
  Driver,
  DriverAvailability,
  DriverLocation,
  DriverLocationInput,
} from '@/types';
import { drivers } from '@/mocks/data/drivers';
import { deliveries } from '@/mocks/data/deliveries';
import { findDriverLocation, upsertDriverLocation } from '@/mocks/data/driver-locations';
import { canTransitionDriverAvailability } from '@/lib/order-lifecycle';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { DriverListQuery, DriverService } from '@/services/drivers/DriverService';
import { retryPendingAssignmentsForDriver } from './assignment-engine';

function findDriver(driverId: string): Driver {
  const driver = drivers.find((entry) => entry.id === driverId);
  if (!driver) {
    throw new ApiError({ code: 'driver_not_found', message: 'Driver not found.' }, 404);
  }
  return driver;
}

export class MockDriverService implements DriverService {
  async list(query?: DriverListQuery): Promise<Driver[]> {
    await delay(280);
    return drivers.filter((driver) => {
      if (query?.accountStatus && driver.accountStatus !== query.accountStatus) return false;
      if (query?.availability && driver.availability !== query.availability) return false;
      return true;
    });
  }

  async getById(driverId: string): Promise<Driver> {
    await delay(220);
    return findDriver(driverId);
  }

  async getByUserId(userId: string): Promise<Driver> {
    await delay(220);
    const driver = drivers.find((entry) => entry.userId === userId);
    if (!driver) {
      throw new ApiError({ code: 'driver_not_found', message: 'No driver profile for this account.' }, 404);
    }
    return driver;
  }

  async setAvailability(driverId: string, availability: DriverAvailability): Promise<Driver> {
    await delay(260);
    const driver = findDriver(driverId);

    if (driver.accountStatus !== 'APPROVED') {
      throw new ApiError(
        {
          code: 'driver_not_approved',
          message:
            driver.accountStatus === 'PENDING_APPROVAL'
              ? 'Your driver account is still awaiting approval.'
              : driver.accountStatus === 'SUSPENDED'
                ? 'A suspended driver cannot change availability.'
                : 'A rejected driver cannot change availability.',
        },
        403,
      );
    }

    if (availability === 'ON_DELIVERY') {
      throw new ApiError(
        {
          code: 'assignment_managed_by_platform',
          message: 'On-delivery status is set by the platform when a delivery is assigned.',
        },
        409,
      );
    }

    if (!canTransitionDriverAvailability(driver.availability, availability)) {
      throw new ApiError(
        {
          code: 'invalid_availability_transition',
          message: `${driver.availability} cannot transition to ${availability}.`,
        },
        409,
      );
    }

    if (availability === 'AVAILABLE' && driver.activeDeliveryId) {
      throw new ApiError(
        {
          code: 'active_delivery_exists',
          message: 'Finish the active delivery before going back online.',
        },
        409,
      );
    }

    driver.availability = availability;

    // A driver coming online may unlock a delivery that is waiting for one.
    // The retry is bounded and idempotent inside the assignment engine.
    if (availability === 'AVAILABLE') {
      retryPendingAssignmentsForDriver(driver.id, 'DRIVER_AVAILABLE');
    }

    return driver;
  }

  async getLocation(driverId: string): Promise<DriverLocation | null> {
    await delay(180);
    findDriver(driverId);
    return findDriverLocation(driverId) ?? null;
  }

  async updateLocation(driverId: string, input: DriverLocationInput): Promise<DriverLocation> {
    await delay(180);
    const driver = findDriver(driverId);

    if (driver.accountStatus !== 'APPROVED') {
      throw new ApiError(
        { code: 'driver_not_approved', message: 'Only an approved driver can publish a location.' },
        403,
      );
    }

    const activeDelivery = driver.activeDeliveryId
      ? deliveries.find((delivery) => delivery.id === driver.activeDeliveryId)
      : undefined;

    if (driver.activeDeliveryId && !activeDelivery) {
      throw new ApiError(
        { code: 'delivery_not_found', message: 'The active delivery could not be found.' },
        404,
      );
    }

    const updatedAt = new Date().toISOString();
    const location: DriverLocation = {
      driverId,
      deliveryId: activeDelivery?.id,
      lat: input.lat,
      lng: input.lng,
      heading: input.heading,
      speedKph: input.speedKph,
      updatedAt,
    };

    upsertDriverLocation(location);

    if (activeDelivery) {
      activeDelivery.driverLocation = location;
      activeDelivery.updatedAt = updatedAt;
    } else if (driver.availability === 'AVAILABLE') {
      // An idle driver can publish its position so pending deliveries can be
      // matched by distance. Never triggers a real assignment on its own.
      retryPendingAssignmentsForDriver(driver.id, 'DRIVER_LOCATION_UPDATED');
    }

    return location;
  }
}
