import type {
  Address,
  AddressInput,
  PaymentMethod,
  ProfileUpdate,
  User,
  UserPreferences,
} from '@/types';

export interface UserService {
  getProfile(): Promise<User>;
  updateProfile(update: ProfileUpdate): Promise<User>;
  updatePreferences(preferences: Partial<UserPreferences>): Promise<User>;
  listAddresses(): Promise<Address[]>;
  createAddress(input: AddressInput): Promise<Address>;
  updateAddress(id: string, input: AddressInput): Promise<Address>;
  deleteAddress(id: string): Promise<void>;
  setDefaultAddress(id: string): Promise<Address[]>;
  listPaymentMethods(): Promise<PaymentMethod[]>;
}
