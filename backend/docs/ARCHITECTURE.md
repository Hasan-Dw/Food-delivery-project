# Savora API — architecture

## Scope

Phases 1 and 2 are implemented. Phase 1 exposes four domains:

- **Authentication** — registration, login, session lookup, logout, password reset.
- **Users** — the signed-in profile, preferences, addresses and read-only payment methods.
- **Restaurants** — public discovery, categories, owner-owned records.
- **Menu items** — public menus plus owner management.

Operational domains are implemented:

- **Checkout** — server-authoritative cart pricing and promotion preview.
- **Orders** — idempotent creation, lifecycle transitions, scoped history.
- **Deliveries** — one delivery per order, platform assignment, transport lifecycle.
- **Drivers** — approval, availability, location snapshots and active-delivery pointer.
- **Promotions** — platform/admin codes, validation and atomic redemption.
- **Tracking** — a scoped snapshot assembler plus a Socket.IO live channel.
- **Routing** — OSRM-compatible road distance and ETA with a labelled fallback.
- **Uploads** — signed Cloudinary storage for restaurant, menu-item and profile images.

Still out of scope: reviews and ratings, notifications, payment gateways, admin
approval tooling and restaurant analytics. The frontend keeps local fixtures for
those read models.

## Shape

A modular monolith built with NestJS 11, TypeScript and Mongoose 8. There is one
deployable process and one MongoDB database, split into feature modules:

```
src/
  main.ts                 bootstrap, global prefix, CORS, Swagger, request id
  app.module.ts           module composition and global providers
  config/                 environment parsing and fail-fast validation
  database/               Mongoose connection and the seed script
  common/                 enums, guards, decorators, filters, pipes, utils
  auth/                   registration/login/session/reset + JWT strategy
  users/                  profile, preferences, addresses, driver profile
  restaurants/            restaurant, category and menu-category records
  menu-items/             menu items and option groups
  checkout/               cart pricing and quote assembly
  orders/                 order creation, lifecycle and history
  deliveries/             delivery lifecycle, assignment and driver release
  drivers/                driver reads, availability and location
  promotions/             admin codes, validation, redemption
  tracking/               scoped order/delivery snapshot
```

Each feature module owns its controller, service, schemas, DTOs, mapper and
response interfaces. Cross-module behaviour is expressed through service calls
(for example, `OrdersService` calls `PricingService`, `DeliveriesService` and
`PromotionsService`) rather than reaching into another module's schema.

## Request lifecycle

1. `requestIdMiddleware` attaches an id to every request and echoes it in the
   `x-request-id` response header.
2. `JwtAuthGuard` (global) rejects anonymous access unless the route or
   controller is marked `@Public()`.
3. `RolesGuard` (global) enforces `@Roles(...)` from the verified JWT user.
4. `ApprovedAccountGuard` (global) enforces `@RequireApproved()` so pending
   owners and drivers cannot use operational endpoints.
5. `AppValidationPipe` (global) rejects unknown properties and returns
   field-level validation errors.
6. The controller delegates to a service. Services enforce ownership from the
   authenticated user id, never from a client-supplied owner id.
7. `ResponseInterceptor` wraps success payloads as `{ data, meta? }`.
8. `AllExceptionsFilter` converts every failure to
   `{ code, message, details?, requestId? }` and hides internal messages.

## Authentication and authorization

- Passwords are hashed with bcrypt (cost 10) and `passwordHash` is `select: false`.
- JWTs are stateless bearer access tokens signed with `JWT_ACCESS_SECRET`
  (minimum 32 characters, validated at boot). There is no refresh-token
  persistence in Phase 1.
- `JwtStrategy` reloads the user on every request. A token cannot carry a stale
  role or approval status, and deleting a user invalidates access immediately.
- Logout is a no-op on the server: the client deletes its token. The endpoint
  exists so clients have one contract in both modes.
- Password reset stores a SHA-256 hash of a random 32-byte token and an expiry
  one hour out. Confirming a reset updates the hash and clears the token. No mail
  transport exists yet; outside production the token is written to the server
  log so the flow can be completed locally.
- Rejected and suspended accounts cannot sign in. A pending account can sign in
  and read its own profile, but `@RequireApproved()` routes stay closed.

### Roles

| Role | Access |
| --- | --- |
| `CUSTOMER` | Registration, login, own profile and addresses, checkout quote, own orders, promotion validation, own tracking. Approved on registration. |
| `RESTAURANT_OWNER` | Everything a customer can do, plus owner restaurant and menu management, and `ACCEPT`/`REJECT`/`PREPARE`/`READY` on their orders. Starts `PENDING_APPROVAL`. |
| `DRIVER` | Registration creates a platform-owned `DriverProfile`. After approval: availability, own delivery reads, `PICK_UP`/`START_TRANSIT`/`DELIVER`, and location snapshots. Starts `PENDING_APPROVAL`. |
| `ADMIN` | Promotion management, driver listing, manual/automatic assignment, unassign/reassign, order cancellation and full reads. Created by the seed only. |

Public registration accepts `CUSTOMER`, `RESTAURANT_OWNER` and `DRIVER` only.
`ADMIN` can only be created by the seed script or a future trusted admin flow.

### Ownership rules

- A restaurant stores `ownerId`. `GET /restaurants/mine`, `POST /restaurants`,
  and `PATCH /restaurants/:id` derive the owner from the token.
- An owner can only update a restaurant whose `ownerId` matches the token.
  Someone else's restaurant returns `404` rather than leaking its existence.
- A menu item belongs to one restaurant and one menu category. Create/update/
  delete/availability all resolve the item, then compare `restaurantId` with a
  restaurant owned by the caller.
- A menu item can never be moved to another restaurant through an update;
  `restaurantId` is omitted from the update DTO.
- Drivers are platform-owned. `DriverProfile` has `userId`, never a
  `restaurantId`.
- An order's customer is always the token subject. An owner must match
  `actor.restaurantId`; a driver can only read orders behind their assigned
  delivery.
- Delivery assignment is admin-only or automatic. A driver may act on a delivery
  only while they are its assigned driver.
- Tracking visibility is limited to the ordering customer, the assigned driver,
  the owning restaurant and admins.

## Orders, deliveries and money

- Orders are created once per `idempotencyKey`. The database enforces uniqueness;
  a repeated request returns the original order, and a key reused with a
  different cart or restaurant returns `409 idempotency_conflict`.
- `PricingService` recalculates every line from the live menu: base price plus
  option deltas, restaurant delivery fee, a fixed `250`-cent service fee, `0` tax.
  Client totals are never trusted.
- Promotions are evaluated server-side for expiration, active flag, restaurant
  scope, minimum subtotal, global usage limit and per-customer usage. Order
  creation redeems the promotion and writes a `promotion_redemptions` row; a
  failed order rolls the usage count back.
- Order creation also snapshots item names, image keys, unit prices and selected
  option names/deltas. Later menu edits cannot rewrite history.
- A delivery is created with the order in `PENDING_ASSIGNMENT`. `READY` triggers
  automatic assignment; failure leaves the delivery queued and does not fail the
  order.
- Only an approved, `AVAILABLE` driver with no `activeDeliveryId`, a fresh GPS
  point and an eligible vehicle may be assigned. Ranking uses routed travel time
  to the restaurant, not straight-line distance. The driver profile update is
  conditional and atomic, so two concurrent assigners cannot both succeed.
- `unassign` releases an `ASSIGNED` delivery back to `PENDING_ASSIGNMENT` and
  leaves the order `READY`. A cancelled delivery can never return to the pool. A
  driver-caused cancellation releases the driver but does not cancel the order.
- `DELIVER` is the only path to order `COMPLETED`; manual completion is rejected
  with `completion_owned_by_delivery`. Completion also releases the driver.
- Tracking returns a scoped snapshot. `live` is `true` only when the Socket.IO
  channel is enabled; HTTP polling remains available as a fallback.

## Protected fields

Clients cannot set these through profile or restaurant DTOs:

- `role`
- `accountStatus`
- `restaurantId`, `driverId`
- restaurant `ownerId`, `status`, `featured`, `rating`, `reviewCount`,
  `distanceKm`, `badges`
- menu item `restaurantId` after creation
- any password field except through registration, login and reset
- order `customerId`, status, totals, payment snapshot, promotion id and
  timestamps
- delivery `driverId`, status, assignment history and timestamps on order
  creation
- driver `accountStatus`, rating, completed deliveries and earnings
- promotion usage counts, creator and active flag are server-owned; admins may
  set configuration but not recorded usage

Unknown properties are rejected by the validation pipe with
`400 validation_failed`; they are never trusted or silently applied. The e2e
suite asserts this for profile updates and protected lifecycle fields.

## Data conventions

- Mongo ObjectIds are serialized to string `id` fields by explicit mappers.
  Response objects never expose `_id`, `__v`, password hashes or reset tokens.
- Menu prices are stored as integer cents (`priceCents`,
  `priceDeltaCents`). Order item prices and every order total are also stored in
  cents (`unitPriceCents`, `subtotalCents`, `discountCents`, `totalCents`) and
  converted to decimal major units in responses.
- Promotion percentages are integers; fixed discounts and minimums are stored in
  cents and exposed as decimal currency.
- Restaurant and delivery fees use the decimal major-unit convention already
  used by the frontend.
- Opening hours and estimated delivery windows keep their array shapes used by
  the UI.
- Every list endpoint returns `{ items, page, perPage, total, hasMore }` as
  `data`; the Phase 2 scoped list endpoints return arrays because they are not
  paginated yet.

## Configuration

See `backend/.env.example`. Required:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Mongo connection string. Defaults to a local database only if omitted in development. |
| `JWT_ACCESS_SECRET` | Signing secret, minimum 32 characters. Boot fails without it. |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime, default `7d`. |
| `PORT` | HTTP port, default `3000`. |
| `CORS_ORIGINS` | Comma-separated allowed browser origins. |
| `SEED_*_PASSWORD` | Required only by `npm run seed`. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME` | Optional identity of the bootstrapped admin. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Optional; enable image uploads. |
| `ROUTING_ENABLED`, `ROUTING_BASE_URL` | Optional; real road routing. Defaults to the public OSRM demo server. |
| `LIVE_TRACKING_ENABLED` | Optional; registers the Socket.IO tracking namespace. |
| `DRIVER_LOCATION_MAX_AGE_MINUTES` | Optional; stale-GPS cutoff for assignment. |

No secret or database credential is committed. `JWT_ACCESS_SECRET` has no
default because a predictable secret would make every token forgeable.

## Frontend integration

The frontend keeps its existing service contracts. `VITE_API_BASE_URL` points
at this API, and the composition root in `src/services/index.ts` composes the
HTTP implementations for auth, users, restaurants, menu items, orders,
deliveries, drivers, promotions, checkout, tracking, image management,
restaurant analytics and admin analytics. There is no mock data source.

## Testing strategy

- Unit: pure helpers such as slug generation and money conversion.
- E2E: starts the real modules, guards, pipes, filter and interceptor against a
  MongoDB instance through `mongodb-memory-server`. `backend/test/mongo-binary.ts`
  first uses a locally installed `mongod`; a download is only attempted when no
  local binary exists.
- The e2e suite covers registration, authorization and ownership, checkout
  pricing, idempotent order creation, menu/promotion revalidation, order
  transitions, delivery assignment/release/completion, driver availability,
  tracking scoping, image validation/ownership and stale-GPS assignment. Routing
  and Socket.IO are disabled in the e2e app so tests stay hermetic.

## Remaining boundaries

Natural next modules: notifications, review submission tied to completed orders,
admin approval tooling, restaurant analytics and payment-gateway integration.
Each should follow the same pattern: schema, DTO, service with ownership checks,
controller, mapper, e2e coverage, then wire the matching frontend service.
