/**
 * Navigation model shared by the navbar, footer and mobile drawer.
 * `soon: true` marks a route that belongs to a teammate and is not mounted yet.
 */
export interface NavItem {
  label: string;
  to: string;
  soon?: boolean;
}

export const primaryNav: NavItem[] = [
  // The dedicated listing lives with Team Member 4. Until it lands, the home
  // restaurant rail is the working discovery surface.
  { label: 'Restaurants', to: '/#restaurants' },
  { label: 'Categories', to: '/#categories' },
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'Offers', to: '/#offers' },
];

export const footerNav = {
  discover: [
    { label: 'All restaurants', to: '/restaurants', soon: true },
    { label: 'Cuisines', to: '/#categories' },
    { label: 'Offers & codes', to: '/#offers' },
    { label: 'Savora picks', to: '/#featured' },
  ] satisfies NavItem[],
  account: [
    { label: 'My profile', to: '/profile' },
    { label: 'Orders', to: '/orders' },
    { label: 'Cart', to: '/cart' },
    { label: 'Track an order', to: '/orders' },
  ] satisfies NavItem[],
  partners: [
    { label: 'Become a partner', to: '/restaurant/dashboard', soon: true },
    { label: 'Restaurant dashboard', to: '/restaurant/dashboard', soon: true },
    { label: 'Partner support', to: '/#support' },
    { label: 'Careers', to: '/#careers' },
  ] satisfies NavItem[],
  support: [
    { label: 'Help centre', to: '/#support' },
    { label: 'Delivery areas', to: '/#cities' },
    { label: 'Contact us', to: '/#support' },
    { label: 'Accessibility', to: '/#accessibility' },
  ] satisfies NavItem[],
};
