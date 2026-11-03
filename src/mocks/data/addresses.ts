import type { Address } from '@/types';

/** The signed-in demo customer's default delivery destination. */
export const demoDeliveryAddress: Address = {
  id: 'addr_home',
  label: 'Home',
  line1: '34 South Portland Avenue',
  line2: 'Apt 4B',
  city: 'Brooklyn',
  state: 'NY',
  postalCode: '11217',
  country: 'USA',
  isDefault: true,
  coordinates: { lat: 40.6872, lng: -73.9744 },
};
