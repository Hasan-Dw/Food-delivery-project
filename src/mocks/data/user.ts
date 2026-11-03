import type { Address, PaymentMethod, User } from '@/types';

export const demoUser: User = {
  id: 'usr_maya_bennett',
  fullName: 'Maya Bennett',
  email: 'maya@example.com',
  phone: '+1 (718) 555-0148',
  avatarKey: 'avatar-maya',
  memberSince: '2023-04-12T00:00:00.000Z',
  role: 'customer',
  preferences: {
    dietary: ['vegetarian'],
    emailReceipts: true,
    orderUpdates: true,
    marketing: false,
  },
};

export const demoAddresses: Address[] = [
  {
    id: 'addr_home',
    label: 'Home',
    line1: '34 South Portland Avenue',
    line2: 'Apt 4B',
    city: 'Brooklyn',
    state: 'NY',
    postalCode: '11217',
    country: 'USA',
    instructions: 'Buzzer 4B. Leave with the doorman if I do not answer.',
    isDefault: true,
    coordinates: { lat: 40.6872, lng: -73.9744 },
  },
  {
    id: 'addr_work',
    label: 'Work',
    line1: '154 Grand Street',
    line2: 'Floor 3 · Studio North',
    city: 'Brooklyn',
    state: 'NY',
    postalCode: '11249',
    country: 'USA',
    instructions: 'Reception will call up. No need to bring it up.',
    isDefault: false,
    coordinates: { lat: 40.7189, lng: -73.9618 },
  },
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: 'pm_visa_4242',
    type: 'card',
    label: 'Visa ending 4242',
    brand: 'visa',
    last4: '4242',
    expiry: '09/28',
    isDefault: true,
  },
  {
    id: 'pm_mastercard_8841',
    type: 'card',
    label: 'Mastercard ending 8841',
    brand: 'mastercard',
    last4: '8841',
    expiry: '02/27',
    isDefault: false,
  },
];
