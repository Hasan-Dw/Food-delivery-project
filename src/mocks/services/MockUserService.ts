import type {
  Address,
  AddressInput,
  PaymentMethod,
  ProfileUpdate,
  User,
  UserPreferences,
} from '@/types';
import { delay } from '@/mocks/utils/delay';
import { demoAddresses, demoUser, paymentMethods } from '@/mocks/data/user';
import { ApiError } from '@/services/api/errors';
import { sessionStorageBridge } from '@/services/auth/session-storage';
import type { UserService } from '@/services/users/UserService';

/**
 * In-memory profile store for the demo. Mirrors a backend that resolves the
 * profile from the authenticated session: the demo user owns the seeded
 * addresses and cards, while accounts created in this tab start empty.
 *
 * Changes survive navigation but not a full reload — the same behaviour a real
 * backend would provide across tabs.
 */
export class MockUserService implements UserService {
  private profiles = new Map<string, User>();
  private addressBooks = new Map<string, Address[]>();
  private paymentBooks = new Map<string, PaymentMethod[]>();

  /** Resolve the active profile the same way a token-scoped API would. */
  private currentUser(): User {
    const session = sessionStorageBridge.read();
    const base = session?.user ?? demoUser;
    const existing = this.profiles.get(base.id);
    if (existing) return existing;

    const profile = structuredClone(base);
    this.profiles.set(base.id, profile);
    return profile;
  }

  private currentAddresses(): Address[] {
    const user = this.currentUser();
    let book = this.addressBooks.get(user.id);
    if (!book) {
      book = user.id === demoUser.id ? structuredClone(demoAddresses) : [];
      this.addressBooks.set(user.id, book);
    }
    return book;
  }

  private currentPaymentMethods(): PaymentMethod[] {
    const user = this.currentUser();
    let book = this.paymentBooks.get(user.id);
    if (!book) {
      book = user.id === demoUser.id ? structuredClone(paymentMethods) : [];
      this.paymentBooks.set(user.id, book);
    }
    return book;
  }

  /** Keep the demo session in step with profile edits so a reload is coherent. */
  private persistSession(user: User): void {
    const session = sessionStorageBridge.read();
    if (!session) return;
    sessionStorageBridge.write(
      { accessToken: session.accessToken, user, expiresAt: session.expiresAt },
      session.remember,
    );
  }

  async getProfile(): Promise<User> {
    await delay(300);
    return structuredClone(this.currentUser());
  }

  async updateProfile(update: ProfileUpdate): Promise<User> {
    await delay(650);
    if (!update.fullName.trim()) {
      throw new ApiError(
        { code: 'validation_error', message: 'Please add your name.', details: { fullName: ['Name is required.'] } },
        422,
      );
    }

    const user = this.currentUser();
    const next: User = {
      ...user,
      fullName: update.fullName.trim(),
      email: update.email.trim().toLowerCase(),
      phone: update.phone.trim(),
      preferences: update.preferences
        ? { ...user.preferences, ...update.preferences }
        : user.preferences,
    };

    this.profiles.set(next.id, next);
    this.persistSession(next);
    return structuredClone(next);
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<User> {
    await delay(450);
    const user = this.currentUser();
    const next: User = {
      ...user,
      preferences: { ...user.preferences, ...preferences },
    };

    this.profiles.set(next.id, next);
    this.persistSession(next);
    return structuredClone(next);
  }

  async listAddresses(): Promise<Address[]> {
    await delay(280);
    return structuredClone(this.currentAddresses());
  }

  async createAddress(input: AddressInput): Promise<Address> {
    await delay(550);
    const addresses = this.currentAddresses();
    const address: Address = {
      ...input,
      id: `addr_${Date.now().toString(36)}`,
      isDefault: input.isDefault ?? addresses.length === 0,
    };

    const next = address.isDefault
      ? [...addresses.map((entry) => ({ ...entry, isDefault: false })), address]
      : [...addresses, address];

    this.addressBooks.set(this.currentUser().id, next);
    return structuredClone(address);
  }

  async updateAddress(id: string, input: AddressInput): Promise<Address> {
    await delay(550);
    const addresses = this.currentAddresses();
    const existing = addresses.find((addr) => addr.id === id);
    if (!existing) {
      throw new ApiError({ code: 'address_not_found', message: 'That address no longer exists.' }, 404);
    }

    const updated: Address = { ...existing, ...input, id };
    const next = addresses.map((entry) => {
      if (entry.id === id) return updated;
      return input.isDefault ? { ...entry, isDefault: false } : entry;
    });

    this.addressBooks.set(this.currentUser().id, next);
    return structuredClone(updated);
  }

  async deleteAddress(id: string): Promise<void> {
    await delay(400);
    const addresses = this.currentAddresses();
    const target = addresses.find((entry) => entry.id === id);
    if (!target) return;

    let next = addresses.filter((entry) => entry.id !== id);
    if (target.isDefault && next.length) {
      next = next.map((entry, index) => ({ ...entry, isDefault: index === 0 }));
    }

    this.addressBooks.set(this.currentUser().id, next);
  }

  async setDefaultAddress(id: string): Promise<Address[]> {
    await delay(400);
    const addresses = this.currentAddresses();
    if (!addresses.some((entry) => entry.id === id)) {
      throw new ApiError({ code: 'address_not_found', message: 'That address no longer exists.' }, 404);
    }

    const next = addresses.map((entry) => ({ ...entry, isDefault: entry.id === id }));
    this.addressBooks.set(this.currentUser().id, next);
    return structuredClone(next);
  }

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    await delay(220);
    return structuredClone(this.currentPaymentMethods());
  }
}
