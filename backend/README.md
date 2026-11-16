# Savora API

NestJS 11 + MongoDB backend for Savora: authentication, user profiles,
restaurants, menus, checkout pricing, orders, deliveries, drivers, promotions,
Cloudinary image uploads, road routing/ETA and live Socket.IO tracking.

Reviews, notifications, payment capture, admin approval dashboards and
restaurant analytics are not included.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+
- A MongoDB instance (local or hosted)
- Optional: a Cloudinary account for image uploads
- Optional: an OSRM-compatible routing server; the public demo server is the default

## Setup

```bash
cd backend
npm ci
cp .env.example .env
```

Edit `backend/.env`:

- `MONGODB_URI` — your database connection string
- `JWT_ACCESS_SECRET` — a random value of at least 32 characters
- `SEED_CUSTOMER_PASSWORD`, `SEED_OWNER_PASSWORD`, `SEED_DRIVER_PASSWORD`,
  `SEED_ADMIN_PASSWORD` — required only before seeding
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME` — optional; identify the bootstrapped
  admin account (defaults: `admin@example.com` / `Priya Raman`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` —
  optional; image endpoints return `503 image_service_unconfigured` until set
- `ROUTING_ENABLED`, `ROUTING_BASE_URL` — optional; defaults to the public OSRM
  demo server. Set `ROUTING_ENABLED=false` to use the labelled straight-line
  fallback (no external calls)
- `LIVE_TRACKING_ENABLED` — optional; enables the Socket.IO tracking channel
  (default `true`)
- `DRIVER_LOCATION_MAX_AGE_MINUTES` — optional; how old a driver GPS point may
  be before the driver is excluded from assignment (default `10`)

Generate a secret with:

```bash
openssl rand -hex 48
```

## Run

```bash
npm run start:dev
```

- API: <http://localhost:3000/api/v1>
- OpenAPI UI: <http://localhost:3000/api/docs>

## Phase 2 endpoints

| Area | Routes |
| --- | --- |
| Checkout | `POST /checkout/quote` |
| Orders | `POST /orders`, `GET /orders`, `GET /orders/active`, `GET /orders/:id`, `GET /orders/:id/history`, `POST /orders/:id/transition` |
| Deliveries | `POST /deliveries`, `GET /deliveries`, `GET /deliveries/active`, `GET /deliveries/by-order/:orderId`, `GET /deliveries/:id`, `POST /deliveries/:id/assign`, `POST /deliveries/:id/auto-assign`, `POST /deliveries/:id/unassign`, `POST /deliveries/:id/reassign`, `POST /deliveries/:id/transition`, `PUT /deliveries/:id/location` |
| Drivers | `GET /drivers`, `GET /drivers/by-user/:userId`, `GET /drivers/:id`, `PATCH /drivers/:id/availability`, `GET /drivers/:id/location`, `PUT /drivers/:id/location` |
| Promotions | `GET /promotions`, `GET /promotions/admin`, `POST /promotions`, `POST /promotions/validate`, `PATCH /promotions/:id`, `DELETE /promotions/:id` |
| Images | `POST/DELETE /restaurants/:id/image`, `POST/DELETE /restaurants/:id/logo`, `POST/DELETE /menu-items/:id/image`, `POST/DELETE /me/profile-image` (multipart `image`) |
| Tracking | `GET /orders/:orderId/tracking`; Socket.IO namespace `/tracking`, room `order:{id}` |

Customer, owner, driver and admin authorization is enforced from the bearer
token. Prices, discounts and totals are always recalculated on the server.

### Live tracking

The Socket.IO namespace `/tracking` requires the access token in the handshake
(`auth.token`). Clients `subscribe` to an `order:{id}` room; the server verifies
access with the same scoping rules as `GET /orders/:orderId/tracking` before
joining the room. Snapshots include route geometry, remaining road distance,
ETA source and the assigned driver. Drivers publish GPS through
`PUT /deliveries/:id/location`, which verifies the caller is the assigned driver.

## Seed

```bash
npm run seed
```

The development seed is idempotent for accounts and restaurants. It creates:

- 8 restaurant categories
- exactly three active Latakia demo restaurants (`شاورمتي`, `اللفاح`, `صحتين`)
  with six menu items each
- `hasan@example.com` and `lama@example.com` as customers
- five approved/available demo drivers in Al-Ziraa, Sheikh Daher, Al-Azhari,
  Al-Raml Al-Janoubi and Daatour
- the approved restaurant owners and the admin account identified by
  `SEED_ADMIN_EMAIL` (default `admin@example.com`)
- old approved restaurant records are suspended (historical orders are not
  deleted), so the active customer catalog contains only the three demo venues
- `WELCOME20` (20% off, $15 minimum, once per customer), `FREESHIP5` ($5 off,
  $20 minimum) and `SWEET10` (10% off desserts), all expiring in 2027

Passwords are the values supplied in the `SEED_*_PASSWORD` variables. No
password is committed. Admin accounts are only created by this seed script;
public registration rejects the `ADMIN` role. The seed is idempotent and safe
to repeat. Restaurant postal codes are intentionally blank for Syria.

After uploading images with the backend Cloudinary integration, set
`SEED_IMAGE_URL_SHAWARMATI_RESTAURANT`, `SEED_IMAGE_URL_AL_LAFFAH_RESTAURANT`
and `SEED_IMAGE_URL_SAHTAIN_RESTAURANT` to their secure URLs before seeding.
Menu image URL variables use `SEED_IMAGE_URL_MENU_<RESTAURANT>_<1..6>` (for
example `SEED_IMAGE_URL_MENU_SHAWARMATI_1`) when real menu uploads are
available; the seed never claims an upload succeeded.

For phone testing, bind Vite to `0.0.0.0`, set
`VITE_API_BASE_URL=http://<computer-lan-ip>:3000/api/v1`, add the frontend
origin to `CORS_ORIGINS`, and use an HTTPS reverse proxy or trusted tunnel:
mobile browser GPS is not available on ordinary insecure LAN HTTP.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run start:dev` | Watch-mode development server |
| `npm run start` | Development server without watch |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Unit tests |
| `npm run test:e2e` | E2E tests against MongoDB |
| `npm run seed` | Insert the development fixtures |

## Tests

```bash
npm run test:e2e
```

The e2e suite uses `mongodb-memory-server`. If a local `mongod` is installed it
is used directly through `test/mongo-binary.ts`; otherwise the library attempts
to download a binary. Set `MONGOMS_SYSTEM_BINARY` to point at a specific
executable.

The suite covers registration validation, duplicate emails, login, session
reload, approval state, role authorization, restaurant ownership, public
visibility, menu ownership/availability, checkout pricing, idempotent order
creation, order transitions, delivery assignment and release, delivery
completion, driver availability, tracking scope, admin-provisioning rejection,
image upload validation/ownership and stale-GPS assignment rules.

Routing and Socket.IO are pinned off in the HTTP-only e2e app
(`ROUTING_ENABLED=false`, `LIVE_TRACKING_ENABLED=false`) so tests assert the
labelled fallback ETA and `live: false` without external network calls.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — modules, guards, request flow,
  ownership and security decisions
- [docs/API-CONTRACT.md](docs/API-CONTRACT.md) — endpoints, payloads, envelope
  and error codes
- [docs/DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) — collections, fields and
  indexes
- [docs/PROGRESS.md](docs/PROGRESS.md) — status, verification and next steps

## Frontend integration

From the repository root:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_DATA_SOURCE=http
```

See `../src/services/README.md` for hybrid-mode behavior. With
`VITE_DATA_SOURCE=http`, auth, profile, restaurants, menus, checkout, orders,
deliveries, drivers, promotions and tracking use this API. Restaurant analytics
and the admin dashboard remain local preview read models.
