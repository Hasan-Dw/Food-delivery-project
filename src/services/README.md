# Frontend data services

All page data flows through the `services` object in `src/services/index.ts`.
Pages and hooks never import a mock or an HTTP client directly.

## Modes

The composition root picks an implementation per domain at startup based on
`src/config/env.ts`:

| Mode | Trigger | Backend-backed domains | Local preview domains |
| --- | --- | --- | --- |
| Preview | `VITE_DATA_SOURCE=mock`, or no `VITE_API_BASE_URL` | `Mock*Service` | `Mock*Service` |
| HTTP | `VITE_DATA_SOURCE=http` and `VITE_API_BASE_URL` set | `Http*Service` | analytics, admin dashboard |

Backend-backed domains are **auth**, **users/profile**, **restaurants**, **menu
items**, **orders**, **deliveries**, **drivers**, **tracking**, **promotions**,
**checkout** and **images** (via the users, restaurants and products services).

Restaurant analytics and the admin dashboard still use local fixtures. Those
read models are not exposed by the API yet.

```
src/services/
  index.ts                 composition root (the only place a mode is chosen)
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
  api/                     ApiClient, ApiError, token/session bridge
```

Image methods live on the domain services that own the asset:
`users.uploadProfileImage/removeProfileImage`,
`restaurants.uploadRestaurantImage/removeRestaurantImage` (cover and logo) and
`products.uploadImage/removeImage`.

## Backend shapes vs. frontend types

- Backend ids are Mongo ObjectIds serialized as strings. Mock data uses readable
  ids such as `res_saffron_oak` and `usr_maya`.
- Backend money fields are returned in the same major units the frontend already
  uses. The backend stores menu prices, order totals and promotions in integer
  cents and converts at the mapper boundary.
- Backend uses `menu-items` and `menu-categories`; the frontend domain type is
  still `Product` and `ProductCategory`.
- `HttpOrderService.create` sends only DTO-safe fields. Customer identity,
  ownership, totals and discounts are derived on the server; client-side ids and
  prices are stripped before submission.
- Checkout totals come from `POST /checkout/quote`; the cart is a draft only.

## Preview mode

Preview mode keeps the full UI usable without a backend. The mock services
implement checkout quotes, promotion validation, order creation and delivery
creation so the checkout and tracking flows remain coherent. They are fixtures:
preview orders never reach MongoDB, and no real payment is taken.

## Changing a service

1. Add or update the interface in `src/services/<domain>/<Domain>Service.ts`.
2. Implement it in `src/services/<domain>/Http<Domain>Service.ts` and, if the
   preview must keep working, in `src/mocks/services/Mock<Domain>Service.ts`.
3. Wire the choice in `src/services/index.ts`.
4. Keep hooks/components pointed at `services`, not at a concrete class.
