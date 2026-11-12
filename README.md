# Savora

**Discover. Order. Enjoy.**

Savora is a cinematic, multi-restaurant food-delivery marketplace. It pairs an editorial, warm-ivory visual system with a production-shaped React architecture: typed service contracts, a central API client, isolated preview data, and clear boundaries for auth, tracking and maps. A NestJS/MongoDB API in `backend/` powers authentication, profiles, restaurants, menus, checkout pricing, orders, deliveries, driver assignment, promotions and tracking snapshots.

The frontend includes customer ordering flows plus role-scoped workspaces for restaurant owners, drivers and administrators. Reviews and ratings remain a separate teammate-owned area.

---

## What is implemented

| Route | Page |
| --- | --- |
| `/` | Home: discovery, category filters, restaurant rail, popular dishes, offers, delivery story |
| `/login`, `/register`, `/forgot-password` | Authentication, registration and password reset |
| `/restaurants/:restaurantName` | Restaurant detail and menu |
| `/cart`, `/checkout` | Cart and server-priced checkout |
| `/order-confirmation/:orderId`, `/orders`, `/orders/:orderId` | Confirmation, history and protected order tracking |
| `/profile` | Protected profile, addresses, preferences and payment methods |
| `/restaurant/dashboard`, `/restaurant/orders`, `/restaurant/orders/:orderId`, `/restaurant/analytics` | Restaurant-owner workspace |
| `/driver/dashboard`, `/driver/active-delivery`, `/driver/history`, `/driver/availability` | Driver workspace |
| `/admin/dashboard`, `/admin/accounts`, `/admin/drivers`, `/admin/deliveries`, `/admin/orders` | Admin workspace |

Reviews and ratings are owned by another teammate and are not part of this branch.

### Data modes

The app runs fully in browser-local preview mode by default. Set `VITE_DATA_SOURCE=http` and `VITE_API_BASE_URL` to use the NestJS API for auth, profiles, restaurants, menus, checkout, orders, deliveries, drivers, promotions and tracking. The admin dashboard and restaurant analytics remain preview fixtures.

---

## Quick start

Requirements: **Node.js 20.19+ or 22.12+** and npm 10+.

```bash
npm ci
npm run dev
```

Open <http://127.0.0.1:5173/>. The app runs entirely on local mock services by default; no backend or API key is required.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on `127.0.0.1:5173` |
| `npm run build` | Type-check the project and build to `dist/` |
| `npm run preview` | Preview the production build on `127.0.0.1:4173` |
| `npm run typecheck` | `tsc -b` with strict settings |
| `npm run lint` | Flat ESLint config for app and scripts |
| `npm run assets` | Rebuild responsive WebP assets from the Unsplash source list |
| `npm run design:serve` | Serve the repository root for reviewing the 17 design references |

### Environment

Copy `.env.example` to `.env` only when you need to override defaults. All values are read once in `src/config/env.ts`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | empty | Backend origin, no trailing slash. Empty keeps the app on mocks. |
| `VITE_API_TIMEOUT_MS` | `15000` | Per-request timeout for the HTTP client |
| `VITE_DATA_SOURCE` | `mock` | `mock` or `http`. If omitted, `http` is selected only when a base URL exists. |
| `VITE_MAP_PROVIDER` | `preview` | Reserved map boundary: `preview`, `google` or `mapbox` |
| `VITE_MAP_TOKEN` | empty | Reserved token for a future map provider |
| `VITE_LIVE_TRACKING` | `false` | Enables the HTTP tracking adapter's SSE subscription |

> The app never reads `import.meta.env` outside `src/config/env.ts`, and no UI component calls `fetch` directly.

---

## Architecture at a glance

```text
Page / component
      │  (no fetch logic)
      ▼
Feature hook  ──►  TanStack Query cache
      │
      ▼
Service interface  (src/services/*/*Service.ts)
      │
      ├── Mock implementation  (src/mocks/services/*)
      └── HTTP implementation  (src/services/*/Http*Service.ts)
                    │
                    ▼
             ApiClient (timeout, auth, errors, 401)
                    │
                    ▼
              Backend API
```

- **Server state:** TanStack Query. Query keys live in `src/lib/query-keys.ts`.
- **Client state:** Zustand for cart, selected delivery area, discovery filters and toasts.
- **Auth:** `AuthProvider` owns session hydration, token attachment and 401 handling. In preview mode the session is browser-only; when the API is enabled, the token is issued and verified by the server.
- **Composition root:** `src/services/index.ts` chooses preview or HTTP implementations once, per domain. Auth, profiles, restaurants, menus, checkout, orders, deliveries, drivers, promotions and tracking use the API when configured; admin and analytics read models stay local.
- **Code splitting:** every page is lazy-loaded; the shell paints immediately.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full map.

---

## Design system

The visual language is an editorial food magazine rather than a conventional delivery app: warm ivory paper, deep olive ink, terracotta accents, soft gold details, large serif display type and generous negative space.

| Token | Value | Role |
| --- | --- | --- |
| Warm Ivory | `#F5F0E7` | Page canvas |
| Light Cream | `#FBF8F1` | Raised surfaces |
| Deep Olive | `#354638` | Primary ink and dark panels |
| Terracotta | `#C65D3B` | Action / emphasis |
| Soft Gold | `#D6AA70` | Warm highlights |
| Warm Brown | `#49382E` | Secondary ink |
| Muted Olive | `#87917B` | Supporting text |

Type: **DM Serif Display** for display and editorial emphasis, **Inter** for UI and body. Both are self-hosted in `public/fonts` with `font-display: swap` and preloaded from `index.html`.

Tokens are defined in `tailwind.config.ts`; shared primitives live in `src/components/ui`; page-level patterns are documented in [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md).

---

## Imagery

- Real food and restaurant photography from Unsplash, licensed under the [Unsplash License](https://unsplash.com/license).
- `scripts/build-assets.mjs` crops each source to its intended ratio and emits WebP at up to three widths.
- `src/config/image-manifest.json` is the single source of 51 assets, including intrinsic dimensions, alt text and credit.
- The `Image` primitive emits `srcset` / `sizes`, intrinsic `width` / `height`, lazy loading by default and a local SVG fallback on error.
- No design reference screenshot is used as an application asset.

Regenerate assets only when the source list changes:

```bash
npm run assets
```

---

## Design references

The `docs/design-references/` directory contains **17 full-page desktop references at 1440 px wide**, one per page in the four-person build:

- **6** are real screenshots of the implemented Savora app.
- **11** are standalone HTML/CSS mockups for pages owned by teammates, rendered in Chrome for visual continuity.

They are documentation only: excluded from the Vite bundle, never imported by `src/`, and not used as UI imagery. See [docs/DESIGN-REFERENCES.md](docs/DESIGN-REFERENCES.md) for the complete mapping table, generation commands and caveats.

To review the interactive mockups:

```bash
npm run design:serve
# http://127.0.0.1:4318/docs/design-references/_src/cart.html
```

---

## Backend

A NestJS 11 + MongoDB (Mongoose 8) API lives in `backend/`. It implements:

- authentication, roles and approval guards;
- profiles, addresses and read-only payment methods;
- restaurants, categories, menu items and option groups;
- server-authoritative checkout quotes;
- orders with idempotent creation, status history and lifecycle transitions;
- deliveries with driver assignment, transport lifecycle and completion;
- driver availability and location snapshots;
- percentage and fixed promotions with usage and per-customer limits;
- a scoped, read-only tracking snapshot.

Start it:

```bash
cd backend
npm ci
cp .env.example .env
# set MONGODB_URI, JWT_ACCESS_SECRET and the SEED_*_PASSWORD values
npm run seed
npm run start:dev
```

`MONGODB_URI` may point at a local MongoDB instance or at MongoDB Atlas. For the
shared team cluster use the SRV form and keep the database name `savora`:

```env
MONGODB_URI=mongodb+srv://<db_user>:<url-encoded-password>@savora-cluster.p1fm9sm.mongodb.net/savora?retryWrites=true&w=majority&appName=savora-cluster
JWT_ACCESS_SECRET=<random value of at least 32 characters>
```

Never commit `backend/.env`; it is ignored. The API listens on
`http://localhost:3000/api/v1`; OpenAPI is at `http://localhost:3000/api/docs`.

Point the frontend at it:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_DATA_SOURCE=http
```

Validation:

```bash
cd backend
npm run typecheck
npm run build
npm test
npm run test:e2e
```

**Security note:** preview mode keeps a browser-only session and must never be
treated as authentication. With the API enabled, credentials are hashed with
bcrypt, access tokens are signed with a server-side secret, and role/approval
checks run on every request. A production deployment should still add
rate-limiting, httpOnly refresh cookies, email delivery for password reset and
secret rotation.

---

## Accessibility and motion

- Semantic landmarks, one `main` per page, labelled navigation and form controls.
- Visible `:focus-visible` rings with a 3 px offset.
- Body and UI text checked against WCAG AA contrast on the cream/ivory surfaces.
- Skip link, keyboard-operable menus, Escape-to-close, focus return.
- All meaningful images have alt text; decorative images use empty alt.
- `prefers-reduced-motion` disables marquee, reveal and transition motion.
- Touch targets are at least 44 px where the layout allows.
- Tested at 390 px, 768 px and 1440 px with no horizontal overflow.

The tracking map is a hand-drawn SVG explicitly labelled **Sample map** and **Illustrative route, not live GPS**. It requests no location permission and simulates no GPS timer.

---

## Validation

Run before shipping:

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

The production build is a static SPA. Configure the host to rewrite unknown paths to `index.html` so `/login`, `/profile` and `/orders/:id` resolve on refresh.

---

## Project structure

```text
src/
  app/            providers, router, layouts
  components/     shared chrome and UI primitives
  config/         env, routes, navigation, site constants, images
  features/       auth, home, profile, search, tracking and dashboards
  hooks/          small reusable hooks
  lib/            formatting, validation, storage, query keys
  mocks/          isolated preview data and service implementations
  services/       contracts, HTTP adapters, API client
  stores/         cart, location, discovery, search dialog, toast
  styles/         Tailwind entry and font faces
  types/          shared domain contracts
backend/          NestJS API, MongoDB schemas, seed script, tests, docs
docs/             architecture, design system, handoff, references
public/           fonts and generated image assets
scripts/          asset build, screenshot, design server (dev only)
```

---

## Documentation

| Document | Contents |
| --- | --- |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Colour, type, spacing, components, motion, accessibility |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, state, routing, data flow, build and deployment |
| [docs/BACKEND-INTEGRATION.md](docs/BACKEND-INTEGRATION.md) | API contracts, auth, tracking, errors, migration |
| [docs/TEAM-HANDOFF.md](docs/TEAM-HANDOFF.md) | Ownership, shared boundaries, integration steps |
| [docs/DESIGN-REFERENCES.md](docs/DESIGN-REFERENCES.md) | All 17 references, mapping and generation |

Backend design notes are kept alongside the API in `backend/docs/` for local
development.

---

## Known limitations

- Auth, profiles, restaurants, menus, checkout, orders, deliveries, drivers, promotions and tracking are API-backed when `VITE_DATA_SOURCE=http`; in preview mode they use browser-local data.
- The admin dashboard and restaurant analytics read models remain local preview fixtures.
- Tracking is a polled snapshot; no live GPS, Socket.IO or map tiles are connected.
- Payments record a method snapshot but no gateway is integrated and no card is charged.
- Reviews and ratings are owned by another teammate and are not part of this branch.
- Owner and driver approval has no admin endpoint yet; only the seed script creates approved fixtures.
- Email delivery for password reset is not configured.
- Images are licensed stock photography of dishes and venues, not photographs of real Savora partners.

---

© 2026 Savora. A food-delivery marketplace built as a portfolio project.
