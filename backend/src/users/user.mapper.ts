import type { Types } from 'mongoose';
import type {
  AddressResponse,
  PaymentMethodResponse,
  UserPreferencesResponse,
  UserResponse,
} from './interfaces/user-response.interface';
import type { Address, PaymentMethod, UserDocument } from './schemas/user.schema';

function idOf(value: unknown): string {
  return String((value as { _id: Types.ObjectId })._id);
}

export function toAddressResponse(address: Address): AddressResponse {
  const response: AddressResponse = {
    id: idOf(address),
    label: address.label,
    line1: address.line1,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: Boolean(address.isDefault),
  };

  if (address.line2) response.line2 = address.line2;
  if (address.instructions) response.instructions = address.instructions;
  if (address.coordinates) {
    response.coordinates = {
      lat: address.coordinates.lat,
      lng: address.coordinates.lng,
    };
  }

  return response;
}

export function toPaymentMethodResponse(method: PaymentMethod): PaymentMethodResponse {
  const response: PaymentMethodResponse = {
    id: idOf(method),
    type: method.type,
    label: method.label,
    isDefault: Boolean(method.isDefault),
  };

  if (method.brand) response.brand = method.brand;
  if (method.last4) response.last4 = method.last4;
  if (method.expiry) response.expiry = method.expiry;

  return response;
}

export function toPreferencesResponse(user: UserDocument): UserPreferencesResponse {
  return {
    dietary: user.preferences?.dietary ?? [],
    emailReceipts: user.preferences?.emailReceipts ?? true,
    orderUpdates: user.preferences?.orderUpdates ?? true,
    marketing: user.preferences?.marketing ?? false,
  };
}

export function toUserResponse(user: UserDocument): UserResponse {
  const response: UserResponse = {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? '',
    memberSince: (user.createdAt ?? new Date()).toISOString(),
    role: user.role,
    accountStatus: user.accountStatus,
    preferences: toPreferencesResponse(user),
  };

  if (user.avatarKey) response.avatarKey = user.avatarKey;
  if (user.restaurantId) response.restaurantId = user.restaurantId.toString();
  if (user.driverId) response.driverId = user.driverId.toString();

  return response;
}
