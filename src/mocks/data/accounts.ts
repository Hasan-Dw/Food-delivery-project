import type { User } from '@/types';
import { demoUser } from './user';

/**
 * Demo credentials for the shared multi-role architecture. These accounts are
 * deliberately in one module so auth and admin mocks operate on the same
 * records. Passwords are plain text and exist only to make the prototype
 * explorable; the real backend owns credential handling.
 */
export interface DemoAccount {
  user: User;
  password: string;
}

const preferences = {
  dietary: [] as User['preferences']['dietary'],
  emailReceipts: true,
  orderUpdates: true,
  marketing: false,
};

export const accounts: DemoAccount[] = [
  {
    user: demoUser,
    password: 'Savora123!',
  },
  {
    user: {
      id: 'usr_noah_kim',
      fullName: 'Noah Kim',
      email: 'noah@example.com',
      phone: '+1 (917) 555-0172',
      avatarKey: 'avatar-maya',
      memberSince: '2024-11-06T00:00:00.000Z',
      role: 'CUSTOMER',
      accountStatus: 'APPROVED',
      preferences,
    },
    password: 'Savora123!',
  },
  {
    user: {
      id: 'usr_ava_patel',
      fullName: 'Ava Patel',
      email: 'ava@example.com',
      phone: '+1 (646) 555-0129',
      avatarKey: 'avatar-maya',
      memberSince: '2025-02-19T00:00:00.000Z',
      role: 'CUSTOMER',
      accountStatus: 'APPROVED',
      preferences,
    },
    password: 'Savora123!',
  },
  {
    user: {
      id: 'usr_sofia_martin',
      fullName: 'Sofia Martin',
      email: 'owner@example.com',
      phone: '+1 (718) 555-0192',
      avatarKey: 'avatar-maya',
      memberSince: '2022-09-03T00:00:00.000Z',
      role: 'RESTAURANT_OWNER',
      accountStatus: 'APPROVED',
      restaurantId: 'res_koji_sushi',
      preferences,
    },
    password: 'Savora123!',
  },
  {
    user: {
      id: 'usr_liam_chen',
      fullName: 'Liam Chen',
      email: 'pending-owner@example.com',
      phone: '+1 (917) 555-0110',
      avatarKey: 'avatar-maya',
      memberSince: '2026-10-28T00:00:00.000Z',
      role: 'RESTAURANT_OWNER',
      accountStatus: 'PENDING_APPROVAL',
      preferences,
    },
    password: 'Savora123!',
  },
  {
    user: {
      id: 'usr_daniel_okafor',
      fullName: 'Daniel Okafor',
      email: 'driver@example.com',
      phone: '+1 (917) 555-0164',
      avatarKey: 'avatar-driver',
      memberSince: '2024-02-14T00:00:00.000Z',
      role: 'DRIVER',
      accountStatus: 'APPROVED',
      driverId: 'drv_daniel',
      preferences,
    },
    password: 'Savora123!',
  },
  {
    user: {
      id: 'usr_amara_singh',
      fullName: 'Amara Singh',
      email: 'pending-driver@example.com',
      phone: '+1 (646) 555-0187',
      avatarKey: 'avatar-driver',
      memberSince: '2026-11-01T00:00:00.000Z',
      role: 'DRIVER',
      accountStatus: 'PENDING_APPROVAL',
      driverId: 'drv_amara',
      preferences,
    },
    password: 'Savora123!',
  },
  {
    user: {
      id: 'usr_luis_fernandez',
      fullName: 'Luis Fernandez',
      email: 'luis@example.com',
      phone: '+1 (347) 555-0133',
      avatarKey: 'avatar-driver',
      memberSince: '2025-03-22T00:00:00.000Z',
      role: 'DRIVER',
      accountStatus: 'APPROVED',
      driverId: 'drv_luis',
      preferences,
    },
    password: 'Savora123!',
  },
  {
    user: {
      id: 'usr_priya_nair',
      fullName: 'Priya Nair',
      email: 'priya@example.com',
      phone: '+1 (929) 555-0141',
      avatarKey: 'avatar-driver',
      memberSince: '2025-08-09T00:00:00.000Z',
      role: 'DRIVER',
      accountStatus: 'APPROVED',
      driverId: 'drv_priya',
      preferences,
    },
    password: 'Savora123!',
  },
  {
    user: {
      id: 'usr_marco_rossi',
      fullName: 'Marco Rossi',
      email: 'suspended-driver@example.com',
      phone: '+1 (718) 555-0155',
      avatarKey: 'avatar-driver',
      memberSince: '2025-06-18T00:00:00.000Z',
      role: 'DRIVER',
      accountStatus: 'SUSPENDED',
      driverId: 'drv_marco',
      preferences,
    },
    password: 'Savora123!',
  },
  {
    user: {
      id: 'usr_platform_admin',
      fullName: 'Savora Operations',
      email: 'admin@example.com',
      phone: '+1 (718) 555-0100',
      avatarKey: 'avatar-maya',
      memberSince: '2021-01-04T00:00:00.000Z',
      role: 'ADMIN',
      accountStatus: 'APPROVED',
      preferences,
    },
    password: 'Savora123!',
  },
];

export function findAccountByEmail(email: string): DemoAccount | undefined {
  const normalised = email.trim().toLowerCase();
  return accounts.find((account) => account.user.email.toLowerCase() === normalised);
}

export function findAccountByUserId(userId: string): DemoAccount | undefined {
  return accounts.find((account) => account.user.id === userId);
}
