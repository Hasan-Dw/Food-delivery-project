# Savora API — progress

## Branch and working tree

- Branch: `hasan-backend`
- Status: the latest backend and frontend work is present but **not committed**.
  No push, merge, publish, deploy or pull request was performed for this change.
- Frontend remains at the repository root. The API lives entirely in
  `backend/` with its own `package.json`, lockfile, TypeScript configs, tests and
  environment file.

## Phase 1 delivered

| Area | Status | Notes |
| --- | --- | --- |
| NestJS scaffold | Done | Nest 11, CommonJS, global prefix `api/v1`, Swagger at `/api/docs`. |
| MongoDB/Mongoose | Done | Phase 1 collections, indexes, explicit response mappers. |
| Configuration | Done | `@nestjs/config` with fail-fast validation of the JWT secret and port. |
| Validation | Done | Global whitelist pipe, nested DTO validation and field-level error details. |
| Response contract | Done | `{ data, meta? }` success envelope and `{ code, message, details?, requestId? }` errors. |
| Auth | Done | Register, login, session, logout, password reset request/confirm. |
| Roles and approval | Done | Global JWT, roles and approved-account guards. |
| Users | Done | Profile, preferences, addresses, read-only payment methods. |
| Restaurants | Done | Public discovery, categories, owner record, menu categories. |
| Menu items | Done | Public list/popular/detail, owner CRUD and availability. |
| Ownership enforcement | Done | Derived from token; non-owned records return `404`. |
| Seed | Done and executed | Categories, four restaurants, sixteen menu items, four accounts. |
| Frontend auth/profile integration | Done | HTTP services, mode-aware copy, role/status badges. |
| Frontend restaurant/menu integration | Done | Query-based restaurant page, no mock data imports. |
| Documentation | Done | Architecture, API contract, schema and this progress file. |

## Phase 2 delivered

| Area | Status | Notes |
| --- | --- | --- |
| Checkout pricing | Done | `POST /checkout/quote`; server recalculates menu price, option deltas, delivery fee, 250-cent service fee, discount, 0 tax. |
| Order creation | Done | `POST /orders`; idempotency key, server totals, item snapshots, promotion redemption, delivery creation. |
| Order lifecycle | Done | `ACCEPT`, `REJECT`, `PREPARE`, `READY`, `CANCEL`; manual `COMPLETE` rejected. |
| Order reads | Done | Scoped list, active order, detail and `/history` timeline. |
| Deliveries | Done | One per order, `PENDING_ASSIGNMENT` → `ASSIGNED` → `PICKED_UP` → `ON_THE_WAY` → `DELIVERED`. |
| Driver assignment | Done | Admin manual assignment, automatic assignment on `READY`, unassign/reassign, concurrency-safe driver reservation. |
| Driver release | Done | Unassign returns the delivery to `PENDING_ASSIGNMENT`; the order stays `READY`; cancelled never returns. |
| Delivery completion | Done | `DELIVER` atomically completes the order and releases the driver. |
| Drivers | Done | Admin list, self read, availability control, location snapshot reads/writes. |
| Promotions | Done | Percentage and fixed discounts, expiry, usage limits, per-customer limits, minimum subtotal, restaurant scope, redemption tracking. |
| Promotion admin | Done | Admin list/create/update/deactivate; public list and customer validation. |
| Tracking | Done | Scoped read-only snapshot with ETA, route points, progress and `live: false`. |
| Seed | Done and executed | Approved driver `driver@example.com`, driver stats, `WELCOME20`, `FREESHIP5`, `SWEET10` expiring 2027. |
| Frontend checkout | Done | Server quote, coupon apply/remove, server totals, minimum-order and invalid-promotion guards, cash-on-delivery fallback. |
| Frontend orders | Done | Order confirmation, order history, protected order tracking. |
| Frontend dashboards | Done | Owner order detail uses the tracking snapshot for assigned driver data; driver actions restricted to `PICK_UP`/`START_TRANSIT`/`DELIVER`. |
| Frontend services | Done | HTTP adapters for every domain, including admin platform analytics and restaurant analytics. |
| Documentation | Done | Contract, architecture, schema and this progress file updated for Phase 2. |

## Phase 3 delivered (backend)

| Area | Status | Notes |
| --- | --- | --- |
| Admin provisioning | Done | Admin is never selectable at registration; the idempotent seed creates the admin from `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL` and `SEED_ADMIN_NAME`. Passwords are hashed by `UsersService`. |
| Cloudinary uploads | Done | Signed `fetch` client (no SDK dependency), 5 MB limit, JPEG/PNG/WebP magic-byte validation, timestamped public IDs, safe folders, store-then-delete-old ordering. Endpoints return `503 image_service_unconfigured` when credentials are absent. |
| Image endpoints | Done | Restaurant cover/logo, menu-item image and own-profile avatar upload/remove. Ownership is enforced from the JWT; users cannot edit another profile or restaurant. |
| Road routing | Done | OSRM-compatible client with 4 s timeout, TTL cache and a clearly labelled straight-line fallback (`ROAD_DETOUR_FACTOR = 1.35`). Public demo server needs no key. |
| Assignment ranking | Done | Excludes unavailable, busy, offline, suspended and stale-GPS drivers; ranks eligible drivers by routed travel time to the restaurant, not straight-line distance. |
| ETA composition | Done | Driver→restaurant travel + remaining prep + pickup + restaurant→customer travel, without double counting; recomputed on assignment, transitions and GPS updates. |
| Live tracking | Done | Socket.IO namespace `/tracking`, JWT handshake revalidated through `JwtStrategy`, room `order:{id}`, subscribe/unsubscribe/snapshot events. Authorization is checked at subscribe time. |
| Driver GPS | Done | `PUT /deliveries/:id/location` verifies the caller is the assigned driver and the delivery is active; updates driver `lastLocation` and broadcasts. A driver-caused cancellation releases the assignment without cancelling the order. |
| Tracking snapshots | Done | Include road route geometry, `remainingDistanceKm`, `etaSource`, nullable `etaMinutes`, progress, driver and restaurant data. |

## Phase 3 delivered (frontend)

| Area | Status | Notes |
| --- | --- | --- |
| Guest rules | Done | Guests can browse, search and view restaurants/menus. `/checkout` requires an approved customer; the cart persists and sign-in returns to checkout. History, tracking and profile are behind authentication. |
| Hero active-order card | Done | Reads `/orders/active` (server-scoped), shows the real restaurant, driver, status, road distance and ETA, and hides when no order is active. Never renders another user's order. |
| Live tracking UI | Done | `socket.io-client` tracking service with resubscribe-on-connect; Leaflet + OpenStreetMap `LiveDeliveryMap` with routed polylines and pins. The illustration remains for mock/demo mode. |
| Driver GPS UI | Done | Browser `watchPosition` publishes every ~4 s while a delivery is active, surfaces denied/unsupported/error states, and stops on completion, unmount or tab close (no background tracking). |
| Image management | Done | Profile avatar uploader, restaurant cover/logo manager and a new menu-management page (create/edit/availability/delete plus dish photos). Shared client-side MIME/size guard. |
| Remote image rendering | Done | Absolute Cloudinary URLs pass through `Image`/`Avatar` with `f_auto,q_auto,w_*` sizing and a graceful fallback. |

## Deliberately not implemented

Reviews and ratings, notifications and email delivery, payment-gateway charges,
admin approval dashboards and restaurant analytics. Reviews is owned separately;
the frontend admin dashboard and restaurant analytics still use local fixtures.

## Verification performed

All commands below were run in this environment on 2026-11-13.

### Backend

| Command | Location | Result |
| --- | --- | --- |
| `npm run typecheck` | `backend/` | Passed |
| `npm run build` | `backend/` | Passed |
| `npm test` | `backend/` | 3 suites, 12 tests passed |
| `npm run test:e2e` | `backend/` | 1 suite, 23 tests passed |
| `npm run seed` | `backend/` | Passed against a temporary database, then dropped |
| Atlas connection | `backend/` | Connected to the `savora` database; server started and stopped cleanly |

The seed was also run twice against a disposable local MongoDB with
`SEED_ADMIN_EMAIL=ops@savora.test` and `SEED_ADMIN_NAME=Ops Admin`. The first run
created one `ADMIN`/`APPROVED` account, the second reported it already existed,
and the stored password was a 60-character bcrypt `$2b$` hash. The database was
dropped afterwards.

The public OSRM endpoint answered a live route probe (`code=Ok`, 0.66 km road
distance for the sample Brooklyn pair), confirming road distance differs from
the straight-line fallback.

E2E coverage (Phase 1):

1. Malformed registration is rejected and creates no account.
2. Restaurant registration requires restaurant details.
3. Customers register as approved; no password hash is returned.
4. Duplicate email returns `409`.
5. Login succeeds with valid credentials and fails with a wrong password.
6. Profile routes are protected; protected profile fields are rejected.
7. Session lookup returns a fresh session.
8. Owners and drivers remain `PENDING_APPROVAL`.
9. Restaurant creation requires `RESTAURANT_OWNER`.
10. An owner cannot manage another owner's restaurant.
11. Pending restaurants are hidden from discovery.
12. Menu ownership and availability rules are enforced.

E2E coverage (Phase 2):

13. Checkout prices the cart server-side and snapshots purchased items.
14. A repeated checkout key is idempotent, and unknown fields are rejected.
15. The order and delivery lifecycle runs end to end; delivery completion
    completes the order.
16. Double assignment is prevented, and unassign then reassign works.
17. Driver availability rules and assignment permissions are enforced.
18. Promotions are validated server-side and redemptions are tracked.

E2E coverage (Phase 3):

19. Unauthenticated requests are rejected on every protected surface.
20. Public registration never provisions an administrator.
21. Uploads are validated by content, and unconfigured image storage returns
    `503 image_service_unconfigured`.
22. Restaurant, menu-item and profile image changes are scoped to their owner.
23. Stale-GPS drivers are skipped by assignment, and location updates are
    accepted only from the assigned driver.

### Frontend

| Command | Location | Result |
| --- | --- | --- |
| `npm run typecheck` | repository root | Passed |
| `npm run lint` | repository root | Passed, zero warnings |
| `npm run build` | repository root | Passed |

Not executed:

- Browser-based end-to-end tests against a running API (none are configured).
- A production deployment or hosted database.
- A full seeded HTTP walkthrough of every mutation (the e2e suite covers the API
  behaviour, and the frontend uses the same contract).
- Real Cloudinary uploads: no credentials were available, so endpoints were
  verified to return `503 image_service_unconfigured`. Upload/preview/replace/
  remove must be re-checked once `CLOUDINARY_*` is configured.
- Live OSRM calls and Socket.IO in a real browser session: the e2e app pins
  `ROUTING_ENABLED=false` and `LIVE_TRACKING_ENABLED=false`, so it asserts only
  the labelled fallback ETA and `live: false`.
- Notifications and payment capture.

MongoDB execution note: the e2e suite uses the installed
`C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe` through
`backend/test/mongo-binary.ts`. Downloading a MongoDB binary from
`fastdl.mongodb.org` is not possible from this network (HTTP 403), so the
hosted-download path was **not** exercised. On a machine without a local
`mongod`, `mongodb-memory-server` will try its downloader and may fail for the
same network reason.

## Frontend changes for Phase 3

- Guest checkout is guarded by `<ProtectedRoute roles={['CUSTOMER']} />`; the
  cart is persisted and `LoginPage`/`RegisterPage` return to `state.from`.
- `useActiveOrder` reads `/orders/active` only for signed-in customers and feeds
  the new `HeroActiveOrderCard`; the old hardcoded sample chip was removed.
- `HttpTrackingService` uses Socket.IO (`/tracking`, token in `auth`) with
  resubscribe-on-connect and an HTTP fallback flag (`VITE_LIVE_TRACKING`).
- `useOrderTracking` writes pushed snapshots into the TanStack Query cache.
- `TrackingMap` switches to `LiveDeliveryMap` (Leaflet + OpenStreetMap, routed
  polyline) for API data and keeps the illustration for mocks.
- Driver active delivery publishes browser GPS and shows a status panel that
  explains permission, signal and stop conditions.
- Profile avatar uploader plus restaurant cover/logo and menu-management pages;
  all upload UIs share `useImagePicker` and `src/lib/image-upload.ts`.
- `Image`/`Avatar` accept absolute Cloudinary URLs with optimized sizing and
  fallbacks.

## Known limitations

1. **No payment gateway.** Orders store a payment-method snapshot and
   `paymentStatus` remains `PENDING`. No card is charged.
2. **No admin approval tooling.** Owners and drivers start pending; only the seed
   script creates approved fixtures. Admin dashboards remain local fixtures.
3. **No email transport.** Reset tokens are written to the development log.
4. **Stateless logout.** Access tokens remain valid until expiry; no revocation
   list or refresh-token rotation.
5. **Cloudinary credentials required.** Upload endpoints are inert until
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are
   set; no end-to-end upload was performed.
6. **Public OSRM limits.** The default routing server is a shared demo instance;
   production traffic should point `ROUTING_BASE_URL` at a dedicated router.
7. **No background GPS.** Driver location is published only while the delivery
   page is open in a browser tab; closing the tab stops tracking.
8. **Analytics and admin dashboard remain local.** Those frontend read models
   are still fixtures.
9. **MongoDB download fallback.** The hosted-download path is blocked from this
   network and was not verified.

## Next steps

1. Configure Cloudinary and verify upload/preview/replace/remove end to end.
2. Point routing at a production OSRM/Mapbox-compatible server and load-test it.
3. Add admin approval endpoints and an approval audit trail.
4. Integrate the separate Reviews & Ratings module when it is merged.
5. Add notification delivery and a mail/push transport.
6. Add a payment-gateway boundary and payment webhooks.
7. Replace the remaining local analytics/admin read models with HTTP services.
8. Add rate limiting, refresh-token rotation and request-level audit logging.
