# Savora

**Discover. Order. Enjoy.**

Savora is a cinematic, multi-restaurant food-delivery marketplace frontend. It pairs an editorial, warm-ivory visual system with a production-shaped React architecture: typed service contracts, a central API client, isolated mocks, and clear boundaries for auth, tracking and maps.

This repository is the **Team Member 1** slice of a four-person build. It implements **six pages** and intentionally leaves the other eleven pages to teammates.

![Savora homepage — full-page design reference](docs/design-references/my-pages/01-home.png)

---

## What is implemented

| Route | Page | Notes |
| --- | --- | --- |
| `/` | Home | Discovery, category filters, restaurant rail, popular dishes, offers, delivery story |
| `/login` | Login | Demo credentials, validation, redirect-back, demo disclosure |
| `/register` | Register | Creates a per-user mock profile and session |
| `/forgot-password` | Forgot password | Generic, non-enumerating mock response |
| `/profile` | Profile | Protected route; personal details, addresses, preferences, payment methods (read-only) |
| `/orders/:orderId` | Order tracking | Public shareable link, demo map, timeline, driver and receipt |

Demo order: **`/orders/ord_10482`** (ETA 14 min, status `on_the_way`).

Demo account: **`maya@example.com`** / **`Savora123!`**

### Deliberately not implemented

These routes are reserved in `src/config/routes.ts` and documented for handoff, but are **not mounted** and have no placeholder pages or components:

- Team Member 2 — `/cart`, `/checkout`, `/order-confirmation/:orderId`, `/orders`
- Team Member 3 — `/restaurant/dashboard`, `/restaurant/orders`, `/restaurant/menu`, `/restaurant/categories`, `/restaurant/settings`
- Team Member 4 — `/restaurants`, `/restaurants/:restaurantId`

Visiting one of these paths renders the friendly 404, which explains that the page belongs to another teammate. There are no stub routes, fake dashboards or hidden placeholders.

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
| `VITE_MAP_PROVIDER` | `demo` | Reserved map boundary: `demo`, `google` or `mapbox` |
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
- **Auth:** `AuthProvider` owns session hydration, token attachment and 401 handling. The mock session is explicitly a frontend demo, not security.
- **Composition root:** `src/services/index.ts` chooses mock or HTTP implementations once.
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

## Backend readiness

The app is built to switch data sources without touching a page:

```env
VITE_API_BASE_URL=https://api.example.com
VITE_DATA_SOURCE=http
```

The HTTP adapters already implement the endpoint shape used by the services. See [docs/BACKEND-INTEGRATION.md](docs/BACKEND-INTEGRATION.md) for the request/response contract, auth flow, SSE tracking channel, error envelope and migration checklist.

**Security note:** mock auth stores a demo session in Web Storage and compares a plain-text demo password. It is not authentication. A real deployment must issue server-side sessions (preferably httpOnly cookies), hash credentials, rate-limit login and reset, and never trust client state.

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

The tracking map is a hand-drawn SVG explicitly labelled **Demo map** and **Illustrative route, not live GPS**. It requests no location permission and simulates no GPS timer.

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
  features/       auth, home, profile, search, tracking (pages + local components)
  hooks/          small reusable hooks
  lib/            formatting, validation, storage, query keys
  mocks/          isolated demo data and service implementations
  services/       contracts, HTTP adapters, API client
  stores/         cart, location, discovery, search dialog, toast
  styles/         Tailwind entry and font faces
  types/          shared domain contracts
docs/             architecture, design system, backend, handoff, references
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

---

## Known limitations

- Authentication, orders, profile data and tracking are **mock/demo** implementations.
- The demo map is illustrative; no live GPS or map tiles are connected.
- Payment methods are displayed but not editable; no payment provider is integrated.
- Images are licensed stock photography of dishes and venues, not photographs of real Savora partners.
- The other eleven pages are design references only, not application code.
- The app is a frontend deliverable; no backend, database or deployment configuration is included.

---

© 2026 Savora. A demo marketplace built as a frontend portfolio project.
