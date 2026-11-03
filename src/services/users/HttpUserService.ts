import type {
  Address,
  AddressInput,
  PaymentMethod,
  ProfileUpdate,
  User,
  UserPreferences,
} from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { UserService } from './UserService';

export class HttpUserService implements UserService {
  constructor(private readonly client: ApiClient) {}

  async getProfile(): Promise<User> {
    const response = await this.client.get<User>('/me');
    return response.data;
  }

  async updateProfile(update: ProfileUpdate): Promise<User> {
    const response = await this.client.patch<User>('/me', update);
    return response.data;
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<User> {
    const response = await this.client.patch<User>('/me/preferences', preferences);
    return response.data;
  }

  async listAddresses(): Promise<Address[]> {
    const response = await this.client.get<Address[]>('/me/addresses');
    return response.data;
  }

  async createAddress(input: AddressInput): Promise<Address> {
    const response = await this.client.post<Address>('/me/addresses', input);
    return response.data;
  }

  async updateAddress(id: string, input: AddressInput): Promise<Address> {
    const response = await this.client.put<Address>(`/me/addresses/${encodeURIComponent(id)}`, input);
    return response.data;
  }

  async deleteAddress(id: string): Promise<void> {
    await this.client.delete(`/me/addresses/${encodeURIComponent(id)}`);
  }

  async setDefaultAddress(id: string): Promise<Address[]> {
    const response = await this.client.patch<Address[]>(
      `/me/addresses/${encodeURIComponent(id)}/default`,
    );
    return response.data;
  }

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await this.client.get<PaymentMethod[]>('/me/payment-methods');
    return response.data;
  }
}
