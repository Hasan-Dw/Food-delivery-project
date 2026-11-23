# Backend Integration Guide

This document defines the HTTP contract the frontend already expects. There is **no backend in this repository**: the adapters in `src/services/*/Http*Service.ts` are the client half of the contract.

Switch the app from mocks to a real API with two variables:

```env
VITE_API_BASE_URL=https://api.example.com
VITE_DATA_SOURCE=http
```

No page or component changes. `src/services/index.ts` selects every HTTP adapter; `src/config/env.ts` is the only place that reads environment variables.

---

## 1. Transport behaviour

`src/services/api/client.ts` is the single HTTP client.

| Concern | Behaviour |
| --- | --- |
| Base URL | `env.apiBaseUrl`, trailing slashes removed |
| Timeout | `VITE_API_TIMEOUT_MS`, default 15 000 ms, per request via `AbortController` |
| Auth header | `Authorization: Bearer <accessToken>` unless `auth: false` |
| Cookies | `credentials: 'include'` on every request |
| JSON | Request body is JSON; `Accept: application/json` |
| Query arrays | Repeated keys (`?tag=a&tag=b`) |
| 204 | Resolves `{ data: undefined }` |
| 401 | Emits a deduplicated unauthorized event → session cleared, cache cleared, user returned to login |
| Error body | Read as JSON when `content-type` is JSON, otherwise text |
| Envelope | Accepts `{ data, meta }` **or** a plain payload, wraps the latter as `{ data }` |
| Request ID | Reads `x-request-id` into `ApiError.requestId` |

### Response envelope

Preferred:

```json
{
  "data": { "...": "..." },
  "meta": { "page": 1, "perPage": 24, "total": 43, "requestId": "req_01" }
}
```

A plain payload is also accepted, but pagination metadata is then lost.

### Error envelope

```json
{
  "code": "validation_error",
  "message": "Please check the highlighted fields.",
  "details": {
    "email": ["Enter a valid email address."]
  },
  "requestId": "req_01H..."
}
```

The frontend maps this to `ApiError`:

```ts
{
  name: 'ApiError',
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>,
  requestId?: string,
  isNetworkError: boolean
}
```

Use 4xx for client errors, 5xx for server faults, and keep `message` safe to display. Do not return stack traces or HTML.

### Suggested status codes

| Status | Use |
| --- | --- |
| 200 | Read/update success |
| 201 | Created address/account |
| 204 | Delete/logout success |
| 400 | Malformed request |
| 401 | Missing/expired session |
| 403 | Authenticated but not allowed |
| 404 | Unknown order, restaurant, address |
| 409 | Email already registered |
| 422 | Field validation (`details` populated) |
| 429 | Rate limited (login, reset) |
| 5xx | Server fault |

---

## 2. Authentication

Endpoints implemented by `HttpAuthService`:

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/auth/login` | No | `{ email, password }` | `AuthSession` |
| POST | `/auth/register` | No | `RegisterPayload` | `AuthSession` |
| POST | `/auth/password-reset` | No | `{ email }` | `{ message: string }` |
| GET | `/auth/session` | Yes | — | `AuthSession` |
| POST | `/auth/logout` | Yes | — | `204` |

`AuthSession`:

```json
{
  "accessToken": "opaque-token",
  "expiresAt": "2026-11-04T18:00:00.000Z",
  "user": {
    "id": "usr_01",
    "fullName": "Maya Bennett",
    "email": "maya@example.com",
    "phone": "+1 718 555 0142",
    "avatarKey": "avatar-maya",
    "memberSince": "2024-03-18T00:00:00.000Z",
    "role": "CUSTOMER",
    "accountStatus": "APPROVED",
    "preferences": {
      "dietary": ["vegetarian"],
      "emailReceipts": true,
      "orderUpdates": true,
      "marketing": false
    }
  }
}
```

### Client behaviour

1. Login/register writes the session to `localStorage` when “keep me signed in” is checked, otherwise `sessionStorage`.
2. The access token is copied into an in-memory module (`authToken`); the API client never reads storage.
3. On boot, `AuthProvider` calls `getSession()`. `HttpAuthService` uses the stored token to call `GET /auth/session`; if that fails, it returns `null` and the app becomes anonymous.
4. Any 401 triggers `emitUnauthorized()` once per tick. `AuthProvider` clears the token, storage and Query cache.
5. Logout calls the endpoint, then always clears local state.

### Roles and approval workflow

`role` is one of `CUSTOMER`, `RESTAURANT_OWNER`, `DRIVER`, `ADMIN`. Public registration accepts only the first three; admin accounts are provisioned internally and can never be self-selected.

`RegisterPayload` carries the requested role and the fields that role needs:

```json
{
  "fullName": "Avery Chen",
  "email": "avery@example.com",
  "password": "••••••••",
  "phone": "+1 718 555 0110",
  "role": "RESTAURANT_OWNER",
  "restaurant": {
    "name": "Avery's Table",
    "address": "120 Franklin Street, Brooklyn, NY",
    "phone": "+1 718 555 0110",
    "description": "Seasonal neighbourhood cooking."
  }
}
```

```json
{
  "fullName": "Sam Rivera",
  "email": "sam@example.com",
  "password": "••••••••",
  "phone": "+1 718 555 0111",
  "role": "DRIVER",
  "driver": {
    "phone": "+1 718 555 0111",
    "serviceArea": "Brooklyn North",
    "vehicle": "scooter"
  }
}
```

Rules:

- `restaurant` is required when `role` is `RESTAURANT_OWNER`; the backend should create a restaurant shell in an unapproved/inactive state and link it to the owner.
- `driver` is required when `role` is `DRIVER`; the backend should create a `PENDING_APPROVAL` driver profile linked by `userId`.
- Treat the requested `role` as a request, never as granted authority. Reject attempts to register as `ADMIN`.
- Validate role-specific fields server-side and return field errors in `details`.

`accountStatus` is one of `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`:

1. A new customer account is `APPROVED` immediately.
2. A new restaurant-owner or driver account is `PENDING_APPROVAL` and may sign in, but operational dashboards are blocked by the shared route guard.
3. An admin reviews the account. `REJECTED` and `SUSPENDED` accounts receive explicit access notices instead of an empty dashboard.
4. Approving a driver also enables their `Driver` profile; rejection or suspension forces availability to `OFFLINE`.

The frontend guard is not authorization. Every endpoint must re-check the role and approval status from the authenticated session, and return `403` for denied operations.

### Security requirements for the backend

The frontend demo is **not** secure authentication. Before production:

- Hash passwords with Argon2id/bcrypt; never compare plain text.
- Prefer **httpOnly, Secure, SameSite=Lax/Strict cookies** over Web Storage tokens.
- If using bearer tokens, keep access tokens short-lived and rotate refresh tokens.
- Rate-limit and lock out credential stuffing on `/auth/login`.
- Make `/auth/password-reset` always return the same generic message and status, whether or not the address exists. The current UI expects exactly that.
- Invalidate all sessions on password change.
- Add CSRF protection if cookies are used for state-changing requests.
- Set `Access-Control-Allow-Origin` to the exact frontend origin (not `*`) and `Access-Control-Allow-Credentials: true` when cookies are used.
- Never expose secrets through `VITE_*`; every Vite variable is public.

> If the backend uses cookies, the `HttpAuthService` can keep returning an `AuthSession` for UI identity, but the token may be omitted from JS. The provider only needs `user` and `expiresAt`; `accessToken` is currently required by the type. Adjust the contract deliberately rather than shipping a fake token.

---

## 3. Profile, addresses and payment methods

Implemented by `HttpUserService`:

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/me` | — | `User` |
| PATCH | `/me` | `{ fullName, email, phone, preferences? }` | `User` |
| PATCH | `/me/preferences` | `Partial<UserPreferences>` | `User` |
| GET | `/me/addresses` | — | `Address[]` |
| POST | `/me/addresses` | `AddressInput` | `Address` (201) |
| PUT | `/me/addresses/:id` | `AddressInput` | `Address` |
| DELETE | `/me/addresses/:id` | — | `204` |
| PATCH | `/me/addresses/:id/default` | — | `Address[]` |
| GET | `/me/payment-methods` | — | `PaymentMethod[]` |

`AddressInput`:

```json
{
  "label": "Home",
  "line1": "41 Greenpoint Avenue",
  "line2": "Apt 3B",
  "city": "Brooklyn",
  "state": "NY",
  "postalCode": "11222",
  "country": "United States",
  "instructions": "Buzz 3B · leave at the door",
  "isDefault": true
}
```

Rules:

- Exactly one address may be default. `PATCH .../default` returns the full updated list so the UI can replace its cache in one step.
- Deleting the default should promote another address server-side and return the resulting list, or the client must refetch.
- Payment methods are **read-only** in this build: display brand, last4, expiry, default flag. Never return full PAN/CVV.
- Profile updates must be scoped to the authenticated user; ignore any client-supplied user ID.

The frontend validates with Zod (`src/lib/validation.ts`) but the server must validate independently and return field errors in `details`.

---

## 4. Restaurants, categories and products

Implemented by `HttpRestaurantService` and `HttpProductService`.

| Method | Path | Query | Response |
| --- | --- | --- | --- |
| GET | `/restaurant-categories` | — | `RestaurantCategory[]` |
| GET | `/restaurants` | `search`, `category`, `sort`, `page`, `perPage` | `Paginated<Restaurant>` |
| GET | `/restaurants/featured` | — | `Restaurant[]` |
| GET | `/restaurants/:idOrSlug` | — | `Restaurant` |
| GET | `/products/popular` | `limit` | `Product[]` |
| GET | `/products` | `search`, `restaurantId`, `categoryId`, `page`, `perPage` | `Paginated<Product>` |
| GET | `/products/:id` | — | `Product` |
| GET | `/restaurants/:id/products` | — | `Product[]` |
| GET | `/restaurants/:id/product-categories` | — | `ProductCategory[]` |

`sort` values: `recommended`, `rating`, `delivery_time`, `delivery_fee`.

`Paginated<T>` is the **inner** `data` payload, not the envelope:

```json
{
  "data": {
    "items": [],
    "page": 1,
    "perPage": 24,
    "total": 43,
    "hasMore": true
  }
}
```

`Restaurant` and `Product` field shapes are defined in `src/types/models.ts`. Keep `imageKey` values stable and aligned with `src/config/image-manifest.json`; the frontend resolves them to local WebP variants. If the backend needs to serve its own images, either add an absolute-URL branch to `Image` or return matching keys.

Notes:

- `/restaurants/featured` must be declared before the dynamic `/:idOrSlug` route on the server, or the string “featured” will be treated as an ID.
- The home page requests `perPage: 24`; the client-side filter then narrows by search/category. A future listing page can pass those parameters directly.
- `estimatedDeliveryMinutes` is `[min, max]`; `priceLevel` is `1 | 2 | 3 | 4`; `distanceKm` is numeric.

---

## 5. Orders and tracking

Implemented by `HttpOrderService`, `HttpDeliveryService`, `HttpDriverService`, `HttpAdminService` and `HttpTrackingService`.

### Order endpoints

| Method | Path | Response |
| --- | --- | --- |
| GET | `/orders?restaurantId&customerId&status` | `Order[]` (newest first) |
| GET | `/orders/active` | `Order \| null` |
| GET | `/orders/:orderId` | `Order` |
| GET | `/orders/:orderId/status-history` | `TrackingEvent[]` |
| POST | `/orders/:orderId/transition` | `Order` (`{ action }`) |
| GET | `/orders/:orderId/tracking` | `TrackingSnapshot` |
| GET (SSE) | `/orders/:orderId/tracking/stream` | `snapshot` events |

`orderId` may be an internal ID (`ord_10482`) or a customer-facing code (`SV-10482`). The mock accepts either; the HTTP adapter passes the URL segment through, so the backend should support both or redirect.

### Order shape (abridged)

```json
{
  "id": "ord_10482",
  "code": "SV-10482",
  "customerId": "usr_maya_bennett",
  "restaurantId": "rst_saffron_oak",
  "restaurantName": "Saffron & Oak",
  "restaurantImageKey": "restaurant-saffron-oak",
  "items": [
    {
      "id": "oi_1",
      "productId": "prd_butter_chicken",
      "name": "Butter chicken",
      "imageKey": "dish-butter-chicken",
      "quantity": 1,
      "unitPrice": 18.5,
      "selectedOptions": []
    }
  ],
  "status": "READY",
  "placedAt": "2026-11-03T19:02:00.000Z",
  "acceptedAt": "2026-11-03T19:03:00.000Z",
  "preparingAt": "2026-11-03T19:06:00.000Z",
  "readyAt": "2026-11-03T19:12:00.000Z",
  "deliveryAddress": { "...": "..." },
  "deliveryId": "dlv_10482",
  "totals": {
    "subtotal": 18.5,
    "deliveryFee": 3.99,
    "serviceFee": 2.8,
    "discount": 0,
    "tax": 2.1,
    "total": 27.39
  },
  "paymentMethod": { "...": "..." }
}
```

Orders deliberately do **not** carry `driverId`, ETA or delivery timestamps. Those belong to `Delivery`.

### Order lifecycle

| From | Allowed next |
| --- | --- |
| `PENDING` | `ACCEPTED`, `REJECTED`, `CANCELLED` |
| `ACCEPTED` | `PREPARING`, `CANCELLED` |
| `PREPARING` | `READY`, `CANCELLED` |
| `READY` | `COMPLETED`, `CANCELLED` |
| `COMPLETED`, `REJECTED`, `CANCELLED` | terminal |

Restaurant owners may accept/reject and move preparation. Customers may cancel an eligible order. Admins may perform valid transitions **except manual completion**: `COMPLETED` is reserved for a successful delivery. The backend must reject invalid transitions and any manual completion attempt with `409`.

Owner actions must be scoped to the owner's restaurant, and customer cancellations to the authenticated customer. Admin access is platform-wide.

### Delivery shape (abridged)

```json
{
  "id": "dlv_10482",
  "orderId": "ord_10482",
  "driverId": "drv_daniel",
  "restaurantId": "res_koji_sushi",
  "customerId": "usr_maya_bennett",
  "status": "ON_THE_WAY",
  "estimatedArrivalAt": "2026-11-03T19:46:00.000Z",
  "assignedAt": "2026-11-03T19:14:00.000Z",
  "pickedUpAt": "2026-11-03T19:20:00.000Z",
  "deliveredAt": null,
  "cancelledAt": null,
  "driverLocation": {
    "driverId": "drv_daniel",
    "deliveryId": "dlv_10482",
    "lat": 40.7041,
    "lng": -73.9718,
    "heading": 208,
    "speedKph": 18,
    "updatedAt": "2026-11-03T19:31:15.000Z"
  },
  "createdAt": "2026-11-03T19:02:00.000Z",
  "updatedAt": "2026-11-03T19:31:15.000Z",
  "assignmentHistory": [
    {
      "driverId": "drv_daniel",
      "driverName": "Daniel Okafor",
      "action": "ASSIGNED",
      "at": "2026-11-03T19:14:00.000Z"
    }
  ]
}
```

| From | Allowed next |
| --- | --- |
| `PENDING_ASSIGNMENT` | `ASSIGNED`, `CANCELLED` |
| `ASSIGNED` | `PICKED_UP`, `CANCELLED` |
| `PICKED_UP` | `ON_THE_WAY`, `CANCELLED` |
| `ON_THE_WAY` | `DELIVERED`, `CANCELLED` |
| `DELIVERED`, `CANCELLED` | terminal |

`driverId` is `null` before assignment. A driver may hold at most one active delivery, and only an `APPROVED`, `AVAILABLE` driver with no `activeDeliveryId` may be assigned. Drivers advance pickup/transit; the platform assigns and cancels. Completing delivery should complete the order atomically.

### Driver, delivery and admin endpoints

| Method | Path | Response |
| --- | --- | --- |
| GET | `/drivers?accountStatus&availability` | `Driver[]` |
| GET | `/drivers/:driverId` | `Driver` |
| GET | `/drivers/by-user/:userId` | `Driver` |
| PATCH | `/drivers/:driverId/availability` | `Driver` (`{ availability }`) |
| GET | `/drivers/:driverId/location` | `DriverLocation \| null` |
| PUT | `/drivers/:driverId/location` | `DriverLocation` |
| GET | `/deliveries` | `Delivery[]` |
| GET | `/deliveries/:deliveryId` | `Delivery` |
| GET | `/deliveries/by-order/:orderId` | `Delivery` |
| GET | `/deliveries/active?driverId=` | `Delivery \| null` |
| POST | `/deliveries/:deliveryId/assign` | `Delivery` (`{ driverId }`) |
| POST | `/deliveries/:deliveryId/unassign` | `Delivery` (`{ reason }`) |
| POST | `/deliveries/:deliveryId/reassign` | `Delivery` (`{ driverId, reason }`) |
| POST | `/deliveries/:deliveryId/transition` | `Delivery` (`{ action }`) |
| PUT | `/deliveries/:deliveryId/location` | `Delivery` |
| GET | `/admin/accounts?role&accountStatus` | `User[]` |
| GET | `/admin/drivers?accountStatus` | `Driver[]` |
| PATCH | `/admin/accounts/:userId/status` | `User` (`{ status, reason? }`) |

Driver availability transitions are `OFFLINE → AVAILABLE`, `AVAILABLE → OFFLINE | ON_DELIVERY`, and `ON_DELIVERY → AVAILABLE`. The backend owns these transitions; the frontend helpers mirror them for UX only.

### Assignment, unassignment and reassignment

- `assign` is allowed only when the delivery is `PENDING_ASSIGNMENT`, the driver is `APPROVED` and `AVAILABLE`, the driver has no `activeDeliveryId`, and the order is still active.
- `unassign` releases the driver, clears assignment/pickup/ETA/location fields, returns the delivery to `PENDING_ASSIGNMENT`, and **never changes the order to `CANCELLED`**. A reason is required.
- `reassign` is a distinct operation: it releases the current driver and assigns a new one in one transaction. The mock requires the order to be `READY`; document and enforce your chosen rule server-side. A reason is required.
- Driver failure uses `unassign` (or a dedicated failure endpoint) rather than cancellation. The customer's order stays active and returns to the delivery assignment queue.
- Suspending or rejecting a driver releases any active delivery back to `PENDING_ASSIGNMENT` and sets availability to `OFFLINE`.
- Every assignment decision appends a `DeliveryAssignmentEvent` with `driverId`, `driverName`, `action`, optional `reason` and `at`.
- Account rejection/suspension accepts an optional `reason` for the audit trail. Admin accounts must not be mutable through this endpoint.
- Completing a delivery should complete the order atomically in the same transaction.

### Tracking snapshot

```json
{
  "orderId": "ord_10482",
  "deliveryId": "dlv_10482",
  "orderStatus": "READY",
  "deliveryStatus": "ON_THE_WAY",
  "driver": {
    "id": "drv_daniel",
    "userId": "usr_daniel_okafor",
    "name": "Daniel Okafor",
    "avatarKey": "avatar-driver",
    "vehicle": "scooter",
    "rating": 4.98,
    "completedDeliveries": 2418,
    "phone": "+1 718 555 0164",
    "accountStatus": "APPROVED",
    "availability": "ON_DELIVERY",
    "activeDeliveryId": "dlv_10482",
    "createdAt": "2024-02-14T00:00:00.000Z"
  },
  "driverLocation": {
    "driverId": "drv_daniel",
    "deliveryId": "dlv_10482",
    "lat": 40.7041,
    "lng": -73.9718,
    "heading": 208,
    "speedKph": 18,
    "updatedAt": "2026-11-03T19:31:15.000Z"
  },
  "etaMinutes": 14,
  "estimatedArrivalAt": "2026-11-03T19:46:00.000Z",
  "destination": {
    "label": "Home",
    "address": "41 Greenpoint Avenue, Brooklyn",
    "coordinates": { "lat": 40.7304, "lng": -73.9542 }
  },
  "restaurant": {
    "label": "Saffron & Oak",
    "address": "88 Franklin Street, Brooklyn",
    "coordinates": { "lat": 40.7186, "lng": -73.9571 }
  },
  "route": {
    "points": [
      { "lat": 40.7186, "lng": -73.9571 },
      { "lat": 40.7225, "lng": -73.9558 },
      { "lat": 40.7304, "lng": -73.9542 }
    ],
    "distanceKm": 1.8
  },
  "progress": 0.62,
  "lastUpdated": "2026-11-03T19:32:00.000Z",
  "live": true
}
```

- `orderStatus` and `deliveryStatus` are separate authoritative values; the UI resolves a single display phase without merging the entities.
- `driverLocation` is the latest known position. It may be `null` before assignment.
- `progress` is `0..1` along `route.points`.
- `live` drives the UI label. **Only return `true` when the snapshot is genuinely live.** The demo map must remain labelled as a demo.
- `route.points` must contain at least two points; the client projects them into its SVG.
- Coordinates are WGS84.

### Live channel

`HttpTrackingService` opens:

```ts
new EventSource(`${baseUrl}/orders/:id/tracking/stream`, { withCredentials: true });
```

Expected event:

```text
event: snapshot
data: {"orderId":"ord_10482","orderStatus":"READY","deliveryStatus":"ON_THE_WAY", ... }

```

Requirements:

- Send `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- Send periodic heartbeat comments (`: ping`) to keep proxies open.
- Close or finalize after `DELIVERED` or `CANCELLED`.
- Emit a complete `TrackingSnapshot`, not a partial patch.
- Enable `VITE_LIVE_TRACKING=true` on the frontend. When false, the adapter never opens a stream and the UI stays in demo mode.

**Known constraint:** the browser `EventSource` API cannot set an `Authorization` header. The current adapter relies on cookies (`withCredentials: true`). If the backend uses bearer-only auth, either:

1. authenticate the stream with an httpOnly session cookie, or
2. replace `EventSource` with a `fetch`-based SSE reader or WebSocket that can send the bearer token.

Do not append access tokens to query strings; they leak into logs and referrers.

### Map provider

`VITE_MAP_PROVIDER` and `VITE_MAP_TOKEN` are reserved. `DeliveryMap` is currently a hand-drawn SVG and does not read them. To integrate Google Maps or Mapbox:

1. Keep the `TrackingSnapshot` contract unchanged.
2. Add a provider component behind the same props (`snapshot`).
3. Load the SDK only on the tracking route; never in the shared shell.
4. Do not request geolocation permission — the route is known server-side.
5. Keep the “live” vs “demo” label driven by `snapshot.live`.
6. Add the provider domain to the CSP and restrict the token by referrer/domain.

---

## 6. Promotions

| Method | Path | Response |
| --- | --- | --- |
| GET | `/promotions` | `Promotion[]` |

`Promotion` includes `id`, `title`, `subtitle`, `description`, `code`, `imageKey`, `expiresAt`, `accent` (`terracotta | olive | gold`), optional `minOrder` and `restaurantId`.

Only display an offer if it is currently valid. Expiry should be enforced server-side; the UI does not redeem codes.

---

## 7. Mapping the frontend to the backend

| Frontend service | Backend domain |
| --- | --- |
| `AuthService` | Identity, sessions, password reset |
| `UserService` | Customer profile, addresses, payment methods |
| `RestaurantService` | Restaurant directory, categories, featured |
| `ProductService` | Menu items and menu categories |
| `OrderService` | Purchase lifecycle and status history |
| `DeliveryService` | Transportation, assignment and GPS updates |
| `DriverService` | Platform driver profile, availability and location |
| `AdminService` | Account approvals, suspensions and driver review |
| `TrackingService` | Combined order/delivery snapshot + live channel |
| `PromotionService` | Offers and codes |

The frontend does not implement cart/checkout endpoints because those pages belong to another owner. `useCartStore` is ready for Team Member 2 to connect to a future `CartService` / `OrderService.create`.

---

## 8. Suggested order of integration

1. **Read-only catalogue** — `/restaurants`, `/restaurant-categories`, `/products/popular`, `/promotions`. Verify the home page with `VITE_DATA_SOURCE=http`.
2. **Auth** — login, register, session, logout. Verify refresh, 401, redirect-back, `role` and `accountStatus`.
3. **Profile** — `/me`, addresses, preferences. Verify optimistic/invalidated cache updates.
4. **Orders** — `/orders/:id`, status history, role-authorized transitions.
5. **Admin** — account approval/rejection and driver review before dashboards go live.
6. **Drivers and deliveries** — availability, assignment, one-active-delivery rule, location updates.
7. **Tracking** — snapshot first, then SSE with `VITE_LIVE_TRACKING=true`.
8. **Map** — replace the SVG behind the same contract.
9. **Observability** — propagate `x-request-id`; log it with client errors.

---

## 9. Contract test checklist

- [ ] All endpoints work with `credentials: 'include'` and the exact frontend origin.
- [ ] `401` clears the client session and redirects once, not in a loop.
- [ ] `422` includes `details` keyed by field name.
- [ ] `Paginated<T>` is nested inside `data`.
- [ ] `PATCH /me/addresses/:id/default` returns the full list.
- [ ] `/restaurants/featured` is not swallowed by `/:idOrSlug`.
- [ ] `GET /orders/:id` accepts both ID and code.
- [ ] Invalid order/delivery transitions return `409` and change nothing.
- [ ] Order and delivery statuses are stored separately and never share a column.
- [ ] No role can manually set an order to `COMPLETED`; delivery completion does it atomically.
- [ ] Unassign returns the delivery to `PENDING_ASSIGNMENT` and leaves the order active.
- [ ] A cancelled order is never rewound to `PENDING_ASSIGNMENT`.
- [ ] Every unassign/reassign is reason-audited in `assignmentHistory`.
- [ ] Only approved owners/drivers can reach operational endpoints, even if the UI guard is bypassed.
- [ ] Owner requests are scoped to their `restaurantId`; drivers to their assigned delivery; customers to their own orders.
- [ ] Public registration cannot create an `ADMIN` account.
- [ ] A driver with an active delivery cannot receive a second assignment.
- [ ] Completing a delivery completes its order atomically.
- [ ] `tracking.live` is `false` unless the data is genuinely live.
- [ ] SSE sends complete snapshots and heartbeat comments.
- [ ] SSE authenticates without putting tokens in the URL.
- [ ] Image keys match the manifest, or the app has an absolute-URL path.
- [ ] No full card numbers, CVVs or password hashes cross the API.
- [ ] CORS allows only the deployed frontend, not `*`, when credentials are used.
- [ ] Rate limits exist on login, register and password reset.

---

## 10. What stays mocked

Removing the mocks is a factory change, not an immediate requirement. Until then:

- `MockAuthService` — demo credentials, shared in-memory accounts, plain-text comparison, role-aware registration.
- `MockUserService` — per-user profile/address/payment books, session-aware.
- `MockOrderService` — seeded orders, status history and lifecycle transitions; manual completion is rejected.
- `MockDeliveryService` — seeded deliveries, assignment/unassign/reassign, driver release and lifecycle progress.
- `MockDriverService` — platform drivers, availability, approval guards and mock location updates.
- `MockAdminService` — account approval/rejection/suspension with reasons; driver suspension releases active deliveries.
- `MockTrackingService` — illustrative snapshot, no-op subscription, `live: false`.
- `MockRestaurantService`, `MockProductService`, `MockPromotionService` — seeded catalogue.

Delete or tree-shake them only after the HTTP path is verified. They are isolated under `src/mocks` and are not imported by pages.
