import type {
  Driver,
  DriverAvailability,
  DriverLocation,
  DriverLocationInput,
} from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { DriverListQuery, DriverService } from './DriverService';

export class HttpDriverService implements DriverService {
  constructor(private readonly client: ApiClient) {}

  async list(query?: DriverListQuery): Promise<Driver[]> {
    const response = await this.client.get<Driver[]>('/drivers', {
      query: {
        accountStatus: query?.accountStatus,
        availability: query?.availability,
      },
    });
    return response.data;
  }

  async getById(driverId: string): Promise<Driver> {
    const response = await this.client.get<Driver>(`/drivers/${encodeURIComponent(driverId)}`);
    return response.data;
  }

  async getByUserId(userId: string): Promise<Driver> {
    const response = await this.client.get<Driver>(
      `/drivers/by-user/${encodeURIComponent(userId)}`,
    );
    return response.data;
  }

  async setAvailability(driverId: string, availability: DriverAvailability): Promise<Driver> {
    const response = await this.client.patch<Driver>(
      `/drivers/${encodeURIComponent(driverId)}/availability`,
      { availability },
    );
    return response.data;
  }

  async getLocation(driverId: string): Promise<DriverLocation | null> {
    const response = await this.client.get<DriverLocation | null>(
      `/drivers/${encodeURIComponent(driverId)}/location`,
    );
    return response.data ?? null;
  }

  async updateLocation(driverId: string, input: DriverLocationInput): Promise<DriverLocation> {
    const response = await this.client.put<DriverLocation>(
      `/drivers/${encodeURIComponent(driverId)}/location`,
      input,
    );
    return response.data;
  }
}
