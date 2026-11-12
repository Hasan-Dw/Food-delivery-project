export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  RESTAURANT_OWNER = 'RESTAURANT_OWNER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export enum AccountStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum RestaurantStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum VehicleType {
  BIKE = 'bike',
  SCOOTER = 'scooter',
  CAR = 'car',
}

export enum DriverAvailability {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  ON_DELIVERY = 'ON_DELIVERY',
}

export enum AddressLabel {
  HOME = 'Home',
  WORK = 'Work',
  OTHER = 'Other',
}

export enum PaymentType {
  CARD = 'card',
  CASH = 'cash',
  WALLET = 'wallet',
}

export enum PaymentBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
}

export enum DietaryPreference {
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten-free',
  HALAL = 'halal',
}

/** Roles the public registration endpoint may request. */
export const PUBLIC_REGISTRATION_ROLES: UserRole[] = [
  UserRole.CUSTOMER,
  UserRole.RESTAURANT_OWNER,
  UserRole.DRIVER,
];
