export interface CoordinatesResponse {
  lat: number;
  lng: number;
}

export interface AddressResponse {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  instructions?: string;
  isDefault: boolean;
  coordinates?: CoordinatesResponse;
}

export interface UserPreferencesResponse {
  dietary: string[];
  emailReceipts: boolean;
  orderUpdates: boolean;
  marketing: boolean;
}

export interface PaymentMethodResponse {
  id: string;
  type: string;
  label: string;
  brand?: string;
  last4?: string;
  expiry?: string;
  isDefault: boolean;
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarKey?: string;
  memberSince: string;
  role: string;
  accountStatus: string;
  restaurantId?: string;
  driverId?: string;
  preferences: UserPreferencesResponse;
}
