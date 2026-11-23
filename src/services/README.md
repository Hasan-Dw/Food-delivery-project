# Frontend data services

All page data flows through the `services` object in `src/services/index.ts`.
Pages and hooks never import an HTTP client directly.

## Composition

The composition root always wires the HTTP implementation for every domain:

| Domain group | Implementation |
| --- | --- |
| auth, users/profile, restaurants, menu items, orders, deliveries, drivers, tracking, promotions, checkout, images | `Http*Service` |
| restaurant analytics | `HttpRestaurantAnalyticsService` |
| admin dashboard and platform analytics | `HttpAdminService` |

There is no mock data source and no silent fallback. If `VITE_API_BASE_URL` is
missing, `src/config/env.ts` exposes a configuration error and logs it; requests
fail visibly and pages render their error states.

```
src/services/
  index.ts                 composition root
  auth/                    AuthService contract + HttpAuthService
  users/                   profile, addresses, payment methods
  restaurants/             discovery + categories
  products/                menu items (frontend domain name: Product)
  orders/                  order history, detail, create, transitions
  deliveries/              delivery reads and driver lifecycle actions
  drivers/                 driver reads and availability
  promotions/              public listing + validation
  checkout/                server-authoritative quote
  tracking/                Socket.IO live snapshots (HTTP fallback)
  reviews/                 restaurant, menu item and driver reviews
  analytics/               owner-scoped restaurant analytics
  admin/                   platform administration + analytics
  api/                     ApiClient, ApiError, token/session bridge
```

Image methods live on the domain services that own the asset:
`users.uploadProfileImage/removeProfileImage`,
`restaurants.uploadRestaurantImage/removeRestaurantImage` (cover and logo) and
`products.uploadImage/removeImage`.

## Backend shapes vs. frontend types

- Backend ids are Mongo ObjectIds serialized as strings; the UI treats every id
  as an opaque string.
- Backend money fields are returned in the same major units the frontend already
  uses. The backend stores menu prices, order totals and promotions in integer
  cents and converts at the mapper boundary.
- Backend uses `menu-items` and `menu-categories`; the frontend domain type is
  still `Product` and `ProductCategory`.
- `HttpOrderService.create` sends only DTO-safe fields. Customer identity,
  ownership, totals and discounts are derived on the server; client-side ids and
  prices are stripped before submission.
- Checkout totals come from `POST /checkout/quote`; the cart is a draft only.

## Changing a service

1. Add or update the interface in `src/services/<domain>/<Domain>Service.ts`.
2. Implement it in `src/services/<domain>/Http<Domain>Service.ts`.
3. Wire it in `src/services/index.ts`.
4. Keep hooks/components pointed at `services`, not at a concrete class.
