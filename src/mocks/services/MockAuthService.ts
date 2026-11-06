import type {
  AuthSession,
  RegisterPayload,
  RegistrationRole,
  Restaurant,
  User,
  UserRole,
} from '@/types';
import { accounts, findAccountByEmail } from '@/mocks/data/accounts';
import { drivers } from '@/mocks/data/drivers';
import { restaurants } from '@/mocks/data/restaurants';
import { delay as wait } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { AuthService, PasswordResetResult } from '@/services/auth/AuthService';
import { sessionStorageBridge } from '@/services/auth/session-storage';

const SESSION_HOURS = { remembered: 24 * 7, session: 12 };
const publicRoles: RegistrationRole[] = ['CUSTOMER', 'RESTAURANT_OWNER', 'DRIVER'];

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function createSession(user: User, remember: boolean): AuthSession {
  const hours = remember ? SESSION_HOURS.remembered : SESSION_HOURS.session;
  return {
    accessToken: `demo.${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    user,
    expiresAt: new Date(Date.now() + hours * 3_600_000).toISOString(),
  };
}

/**
 * Create the restaurant shell for a newly registered owner. The account stays
 * pending, so `isOpen` is false until the backend supplies a real onboarding
 * workflow. This keeps owner dashboards useful without inventing a second
 * approval system.
 */
function createRestaurantForOwner(user: User, details: NonNullable<RegisterPayload['restaurant']>): void {
  const restaurantId = `res_${user.id.replace(/^usr_/, '')}`;
  const addressParts = details.address.split(',').map((part) => part.trim());
  const restaurant: Restaurant = {
    id: restaurantId,
    slug: `${slugify(details.name) || 'restaurant'}-${restaurantId.slice(-4)}`,
    name: details.name.trim(),
    tagline: details.description?.trim() || 'A new Savora kitchen, awaiting its first menu.',
    cuisines: ['New on Savora'],
    categorySlugs: [],
    imageKey: 'restaurant-saffron-oak',
    rating: 0,
    reviewCount: 0,
    deliveryFee: 2.99,
    estimatedDeliveryMinutes: [25, 40],
    distanceKm: 1.5,
    minOrder: 15,
    priceLevel: 2,
    isOpen: false,
    badges: ['New'],
    address: {
      id: `addr_${restaurantId}`,
      label: 'Other',
      line1: addressParts[0] || details.address.trim(),
      line2: addressParts.slice(1).join(', ') || undefined,
      city: 'Brooklyn',
      state: 'NY',
      postalCode: '11249',
      country: 'USA',
      isDefault: false,
    },
    openingHours: [{ day: 'Mon – Sun', open: '11:00', close: '22:00' }],
    featured: false,
  };

  restaurants.push(restaurant);
  user.restaurantId = restaurantId;
  user.phone = details.phone;
}

function createDriverProfile(user: User, details: NonNullable<RegisterPayload['driver']>): void {
  const driverId = `drv_${user.id.replace(/^usr_/, '')}`;
  drivers.push({
    id: driverId,
    userId: user.id,
    name: user.fullName,
    avatarKey: user.avatarKey ?? 'avatar-driver',
    vehicle: details.vehicle,
    rating: 5,
    completedDeliveries: 0,
    totalEarnings: 0,
    phone: details.phone,
    serviceArea: details.serviceArea,
    accountStatus: 'PENDING_APPROVAL',
    availability: 'OFFLINE',
    activeDeliveryId: null,
    createdAt: user.memberSince,
  });
  user.driverId = driverId;
  user.phone = details.phone;
}

/**
 * DEMO AUTHENTICATION — NOT SECURE.
 *
 * Accounts live in the shared mock data module so auth and admin mocks see the
 * same records. Passwords are compared in plain text purely to make the
 * prototype explorable. When the backend lands, delete this file from the
 * service factory; nothing in the UI changes.
 */
export class MockAuthService implements AuthService {
  async login({ email, password, remember }: Parameters<AuthService['login']>[0]): Promise<AuthSession> {
    await wait(850);
    const account = findAccountByEmail(email);

    if (!account || account.password !== password) {
      throw new ApiError(
        {
          code: 'invalid_credentials',
          message: 'That email and password do not match. Try the demo account below.',
        },
        401,
      );
    }

    const session = createSession(account.user, remember);
    sessionStorageBridge.write(session, remember);
    return session;
  }

  async register(payload: Parameters<AuthService['register']>[0]): Promise<AuthSession> {
    await wait(1000);
    const email = normaliseEmail(payload.email);

    if (findAccountByEmail(email)) {
      throw new ApiError(
        {
          code: 'email_taken',
          message: 'An account with this email already exists. Try signing in instead.',
          details: { email: ['This email is already registered.'] },
        },
        409,
      );
    }

    const requestedRole: UserRole = payload.role ?? 'CUSTOMER';
    if (!publicRoles.includes(requestedRole as RegistrationRole)) {
      throw new ApiError(
        {
          code: 'role_not_allowed',
          message: 'That account type cannot be created through public registration.',
        },
        403,
      );
    }

    if (requestedRole === 'RESTAURANT_OWNER' && !payload.restaurant) {
      throw new ApiError(
        {
          code: 'restaurant_details_required',
          message: 'Restaurant name, address and contact number are required.',
        },
        422,
      );
    }

    if (requestedRole === 'DRIVER' && !payload.driver) {
      throw new ApiError(
        {
          code: 'driver_details_required',
          message: 'Phone number, service area and vehicle type are required.',
        },
        422,
      );
    }

    const user: User = {
      id: `usr_${Date.now().toString(36)}`,
      fullName: payload.fullName.trim(),
      email,
      phone: payload.phone?.trim() ?? '',
      memberSince: new Date().toISOString(),
      role: requestedRole,
      accountStatus: requestedRole === 'CUSTOMER' ? 'APPROVED' : 'PENDING_APPROVAL',
      preferences: {
        dietary: [],
        emailReceipts: true,
        orderUpdates: true,
        marketing: false,
      },
    };

    if (requestedRole === 'RESTAURANT_OWNER' && payload.restaurant) {
      createRestaurantForOwner(user, payload.restaurant);
    }

    if (requestedRole === 'DRIVER' && payload.driver) {
      createDriverProfile(user, payload.driver);
    }

    accounts.push({ user, password: payload.password });
    const session = createSession(user, true);
    sessionStorageBridge.write(session, true);
    return session;
  }

  async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    await wait(900);
    // Deliberately generic: never disclose whether the address exists.
    if (!normaliseEmail(email).includes('@')) {
      throw new ApiError({ code: 'invalid_email', message: 'Enter a valid email address.' }, 422);
    }
    return {
      message: 'If that email is registered with Savora, a reset link is on its way. It expires in 30 minutes.',
    };
  }

  async getSession(): Promise<AuthSession | null> {
    const stored = sessionStorageBridge.read();
    if (!stored) return null;
    const { remember: _remember, ...session } = stored;
    return session;
  }

  async logout(): Promise<void> {
    await wait(180);
    sessionStorageBridge.clear();
  }
}
