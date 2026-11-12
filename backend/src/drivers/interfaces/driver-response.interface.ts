import type { UserDocument } from '../../users/schemas/user.schema';
import type { DriverProfileDocument } from '../../users/schemas/driver-profile.schema';

export interface DriverResponse {
  id: string;
  userId: string;
  name: string;
  avatarKey: string;
  vehicle: string;
  rating: number;
  completedDeliveries: number;
  totalEarnings: number;
  phone: string;
  serviceArea?: string;
  accountStatus: string;
  availability: string;
  activeDeliveryId: string | null;
  createdAt: string;
}

export interface DriverLocationResponse {
  driverId: string;
  deliveryId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKph?: number;
  updatedAt: string;
}

export function toDriverResponse(
  driver: DriverProfileDocument,
  user: UserDocument,
): DriverResponse {
  return {
    id: driver._id.toString(),
    userId: driver.userId.toString(),
    name: user.fullName,
    avatarKey: user.avatarKey ?? 'avatar-driver',
    vehicle: driver.vehicle,
    rating: driver.rating ?? 5,
    completedDeliveries: driver.completedDeliveries ?? 0,
    totalEarnings: Math.round(driver.totalEarningsCents ?? 0) / 100,
    phone: driver.phone || user.phone || '',
    serviceArea: driver.serviceArea,
    accountStatus: driver.accountStatus,
    availability: driver.availability,
    activeDeliveryId: driver.activeDeliveryId
      ? driver.activeDeliveryId.toString()
      : null,
    createdAt: (driver.createdAt ?? new Date()).toISOString(),
  };
}

export function toDriverLocationResponse(
  driver: DriverProfileDocument,
): DriverLocationResponse | null {
  if (!driver.lastLocation) return null;
  return {
    driverId: driver._id.toString(),
    lat: driver.lastLocation.lat,
    lng: driver.lastLocation.lng,
    heading: driver.lastLocation.heading,
    speedKph: driver.lastLocation.speedKph,
    updatedAt: driver.lastLocation.updatedAt.toISOString(),
  };
}
