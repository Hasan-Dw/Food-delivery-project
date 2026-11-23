# Savora Architecture

**Scope:** a frontend-only, multi-role marketplace slice with customer, restaurant-owner, driver and administrator workspaces, production-shaped data boundaries and isolated demo implementations.

The guiding rule: **UI never talks to the network.** Pages read hooks, hooks read services, and the service factory chooses mock or HTTP once.

---

## 1. Stack

| Layer | Choice | Version |
| --- | --- | --- |
| UI | React + React DOM | 18.3.1 |
| Language | TypeScript (strict) | 5.7.3 |
| Build | Vite | 6.4.5 |
| Styling | Tailwind CSS + PostCSS + Autoprefixer | 3.4.19 |
| Routing | React Router | 6.30.6 |
| Server state | TanStack Query | 5.105 |
| Client state | Zustand (+ persist) | 5.0.16 |
| Forms | React Hook Form + Zod | 7.91 / 3.25 |
| Motion | GSAP | 3.15 |
| Icons | Lucide React | 0.474 |
| Assets | Sharp (build-time only) | 0.33.5 |

No component library, CSS-in-JS runtime or state framework beyond the above.

---

## 2. Directory map

```text
src/
├─ app/
│  ├─ App.tsx                  BrowserRouter + ScrollToTop + router
│  ├─ layouts/
│  │  ├─ CustomerLayout.tsx    Navbar, announcement, main, footer
│  │  └─ AuthLayout.tsx        Split auth shell with brand panel
│  ├─ providers/
│  │  ├─ AppProviders.tsx      QueryClient + AuthProvider + Toaster
│  │  ├─ AuthProvider.tsx      Session lifecycle, 401 handling
│  │  └─ query-client.ts       Query defaults and retry policy
│  └─ router/
│     ├─ index.tsx             The only route table
│     ├─ ProtectedRoute.tsx    Session, role and approval gate
│     ├─ AccessDenied.tsx      Shared forbidden/pending-approval state
│     ├─ NotFoundPage.tsx      Friendly ownership-aware 404
│     └─ ScrollToTop.tsx       Route/hash scroll restoration
├─ components/
│  ├─ shared/                  Navbar, Footer, menus, search, cart button
│  └─ ui/                      Buttons, fields, cards, states, Image, Logo
├─ config/
│  ├─ env.ts                   The only import.meta.env reader
│  ├─ routes.ts                Mounted + reserved route constants
│  ├─ navigation.ts            Nav model with `soon` ownership markers
│  ├─ site.ts                  Brand, support, status metadata
│  ├─ images.ts                Manifest accessors
│  └─ image-manifest.json      51 generated assets
├─ features/
│  ├─ auth/                    pages, PasswordInput, DemoAccountNotice
│  ├─ dashboard/               Shared dashboard shell, panels, cards, dialogs
│  ├─ restaurant-dashboard/    Owner layout, overview, order management, detail
│  ├─ driver-dashboard/        Driver layout, assignment, history, availability
│  ├─ admin-dashboard/         Operations layout, accounts, drivers, deliveries, orders
│  ├─ home/                    page, sections, cards, useHomeData
│  ├─ profile/                 page, forms, address book, preferences
│  └─ tracking/                page, map, timeline, driver, receipt
├─ hooks/                      document title, media query, dismissible, hero
├─ lib/                        cn, format, validation, storage, query keys
├─ mocks/
│  ├─ data/                    accounts, drivers, deliveries, locations, orders, tracking
│  ├─ services/                Mock* implementations of the contracts
│  └─ utils/delay.ts           Deterministic network latency
├─ services/
│  ├─ api/                     ApiClient, auth token, ApiError
│  ├─ admin/                   AdminService + HttpAdminService
│  ├─ auth/                    AuthService + HttpAuthService
│  ├─ deliveries/              DeliveryService + HttpDeliveryService
│  ├─ drivers/                 DriverService + HttpDriverService
│  ├─ orders/                  OrderService + HttpOrderService
│  ├─ products/                ProductService + HttpProductService
│  ├─ promotions/              PromotionService + HttpPromotionService
│  ├─ restaurants/             RestaurantService + HttpRestaurantService
│  ├─ tracking/                TrackingService + HttpTrackingService
│  ├─ users/                   UserService + HttpUserService
│  └─ index.ts                 Composition root
├─ stores/                     cart, location, discovery, toast
├─ styles/                     Tailwind entry + font faces
└─ types/                      Domain models and API envelopes
```

---

## 3. Runtime layers

```text
┌─────────────────────────────────────────────────────────┐
│ Page / section / card                                   │
│ - layout, copy, states                                  │
│ - no fetch, no URL construction, no storage             │
└──────────────────────┬──────────────────────────────────┘
                       │ hooks
┌──────────────────────▼──────────────────────────────────┐
│ Feature hooks                                           │
│ useHomeData · useProfileData · useOrderTracking          │
│ - query keys, enabled flags, invalidation               │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│ TanStack Query cache                                    │
│ - retries, staleTime, loading/error states               │
└──────────────────────┬──────────────────────────────────┘
                       │ interfaces
┌──────────────────────▼──────────────────────────────────┐
│ Services (src/services/index.ts)                        │
│ AuthService · RestaurantService · ProductService         │
│ OrderService · DeliveryService · DriverService           │
│ AdminService · UserService · TrackingService             │
│ PromotionService                                         │
│                                                         │
│   env.useMocks ? Mock*Service : Http*Service             │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
      ┌─────────▼─────────┐     ┌─────────▼──────────────┐
      │ src/mocks/*       │     │ ApiClient              │
      │ local demo data   │     │ timeout · bearer · 401 │
      │ artificial delay  │     │ error normalisation    │
      └───────────────────┘     └─────────┬──────────────┘
                                          │
                                        Backend
```

### Why the extra layer?

- A page can be built before the API exists.
- Switching to HTTP is a two-variable change, not a refactor.
- Every error arriving in the UI is an `ApiError`, regardless of source.
- Mock data is quarantined in `src/mocks` and can be deleted later without touching `src/features`.

---

## 4. Routing and layouts

The mounted route table is deliberately small (`src/app/router/index.tsx`):

```text
<CustomerLayout>
  ├─ /                         HomePage
  ├─ <ProtectedRoute>
  │    └─ /profile             ProfilePage (customer entry)
  ├─ /orders/:orderId          OrderTrackingPage   (public, shareable)
  └─ *                         NotFoundPage
<AuthLayout>
  ├─ /login                    LoginPage
  ├─ /register                 RegisterPage
  └─ /forgot-password          ForgotPasswordPage
<ProtectedRoute roles={['RESTAURANT_OWNER']} requireApproval>
  └─ <RestaurantDashboardLayout>
       ├─ /restaurant/dashboard          RestaurantOverviewPage
       ├─ /restaurant/orders             RestaurantOrdersPage
       └─ /restaurant/orders/:orderId    RestaurantOrderDetailPage
<ProtectedRoute roles={['DRIVER']} requireApproval>
  └─ <DriverDashboardLayout>
       ├─ /driver/dashboard              DriverOverviewPage
       ├─ /driver/active-delivery        DriverActiveDeliveryPage
       ├─ /driver/history                DriverHistoryPage
       └─ /driver/availability           DriverAvailabilityPage
<ProtectedRoute roles={['ADMIN']} requireApproval>
  └─ <AdminDashboardLayout>
       ├─ /admin/dashboard               AdminOverviewPage
       ├─ /admin/accounts                AdminAccountsPage
       ├─ /admin/drivers                 AdminDriversPage
       ├─ /admin/deliveries              AdminDeliveriesPage
       └─ /admin/orders                  AdminOrdersPage
```

- Pages are `React.lazy` imports. A single `Suspense` boundary renders `PageLoader`.
- `CustomerLayout` owns the announcement bar, sticky navbar, `<main id="main">`, footer and skip link.
- `AuthLayout` intentionally omits marketplace chrome; it owns the split photographic panel.
- `ProtectedRoute` waits for session hydration (`loading`) before redirecting, so a refresh does not bounce an authenticated user to login.
- `ProtectedRoute` also accepts optional `roles` and `requireApproval`. A role mismatch or unapproved owner/driver/admin sees the shared `AccessDenied` state instead of an empty dashboard.
- Dashboard workspaces are mounted outside `CustomerLayout`: each has its own sidebar and top bar, and none of them alter the customer navbar.
- `config/routes.ts` centralises every dashboard path. The role entry points are `ROUTES.dashboard`, `ROUTES.driverDashboard` and `ROUTES.adminDashboard`.
- The redirect target is stored in `location.state.from` and validated to start with `/` before use.
- Reserved teammate routes (cart, checkout, discovery) are declared in `config/routes.ts` but **never mounted**. `*` explains ownership instead of pretending the page exists.
- `ScrollToTop` handles both pathname changes and `#hash` anchors that point at another page.

---

## 5. State ownership

| State | Owner | Persistence | Notes |
| --- | --- | --- | --- |
| Remote entities | TanStack Query | In-memory cache | Restaurants, products, promotions, profile, addresses, orders, tracking |
| Session | `AuthProvider` + `sessionStorageBridge` | `localStorage` if “keep me signed in”, else `sessionStorage` | Demo only |
| Access token | `authToken` module | Memory | Never read directly by UI |
| Cart | `useCartStore` | `localStorage` via Zustand persist | Shared boundary for Team Member 2 |
| Delivery area | `useLocationStore` | Memory | Navbar and home copy stay in sync |
| Discovery filters | `useDiscoveryStore` | Memory | Search/category filtered on the home rail |
| Toasts | `useToastStore` | Memory | Auto-dismissing notifications |
| Form state | React Hook Form | Component | Zod schemas in `lib/validation.ts` |
| UI disclosure | Local `useState` | None | Menus, dialogs, expanded sections |

**Rule:** if it comes from a server, it belongs in Query. If it is a client preference needed across components, it belongs in Zustand. Do not copy server data into Zustand.

### Query keys

`src/lib/query-keys.ts` centralises keys so mutations invalidate precisely:

```ts
queryKeys.profile
queryKeys.addresses
queryKeys.paymentMethods
queryKeys.restaurants
queryKeys.restaurantCategories
queryKeys.popularProducts
queryKeys.featuredRestaurants
queryKeys.promotions
queryKeys.order(id)
queryKeys.orderStatusHistory(id)
queryKeys.orderList(query)
queryKeys.restaurantOrders(restaurantId)
queryKeys.tracking(id)
queryKeys.allTracking
queryKeys.drivers
queryKeys.driver(id)
queryKeys.driverByUser(userId)
queryKeys.driverLocation(id)
queryKeys.deliveries
queryKeys.delivery(id)
queryKeys.deliveryForOrder(orderId)
queryKeys.activeDelivery(driverId)
queryKeys.driverDeliveries(driverId)
queryKeys.adminAccounts
queryKeys.adminDrivers
queryKeys.adminDeliveries
queryKeys.adminOrders
```

---

## 6. Authentication boundary

```text
LoginPage
  └─ useAuth().signIn
       └─ AuthProvider
            ├─ services.auth.login()  → mock or HTTP
            ├─ authToken.set(accessToken)
            ├─ sessionStorageBridge.write(session, remember)
            └─ queryClient.clear()

ApiClient
  ├─ reads token from authToken
  ├─ emits on 401 (deduplicated per tick)
  └─ AuthProvider clears session + cache on that event
```

The mock compares a plain-text demo password in memory. This is intentionally **not** secure and is disclosed in the UI. The HTTP adapter stores the returned session in Web Storage for the demo; a real deployment should prefer httpOnly, Secure, SameSite cookies and refresh-token rotation.

`getSession()` on the HTTP adapter validates against `/auth/session` and returns `null` on failure, which fails closed to the anonymous state.

### Roles and account approval

`UserRole` is `CUSTOMER | RESTAURANT_OWNER | DRIVER | ADMIN` and `AccountStatus` is `PENDING_APPROVAL | APPROVED | REJECTED | SUSPENDED`. Public registration may request a customer, restaurant-owner or driver role; it can never create an admin. Customers are approved immediately, while owners and drivers start as `PENDING_APPROVAL`.

`AuthProvider` exposes `role`, `accountStatus`, `isApproved` and `hasRole()`. `sessionStorageBridge` normalises sessions written before this change (lowercase roles, no status) so existing demo tabs keep working. These checks are UX only: the backend must authorize every request from its own session claims.

### Platform-owned drivers

Drivers are Savora accounts, not restaurant staff. The `Driver` model has no `restaurantId`; it links to a user with `userId`, carries platform approval, and has `availability: OFFLINE | AVAILABLE | ON_DELIVERY`. `activeDeliveryId` enforces one active delivery per driver in the initial version. Admin approval lives in `AdminService`; delivery assignment lives in `DeliveryService`.

### Order and delivery separation

`Order` and `Delivery` are separate entities with separate tables and statuses:

- **Order:** `PENDING → ACCEPTED → PREPARING → READY → COMPLETED`, plus `REJECTED` and `CANCELLED`. Restaurant owners accept/reject and move preparation; the customer can cancel an eligible order.
- **Delivery:** `PENDING_ASSIGNMENT → ASSIGNED → PICKED_UP → ON_THE_WAY → DELIVERED`, plus `CANCELLED`. The platform assigns; the driver advances pickup and transit.

`src/lib/order-lifecycle.ts` holds the transition maps, and `src/lib/permissions.ts` holds the role/action matrix and the single-active-delivery rule. The tracking page uses `resolveTrackingPhase()` to display one combined phase without merging the entities.

Key invariants:

- No role can manually move an order to `COMPLETED`. Delivery completion is the normal source of order completion; the mock delivery service updates both records atomically.
- `PENDING_ASSIGNMENT` is the only state a released delivery returns to. A cancelled order is never rewound to `PENDING_ASSIGNMENT`.
- Drivers advance `PICK_UP`, `START_TRANSIT` and `DELIVER`; only the platform assigns, unassigns or reassigns.
- `unassign` releases the driver and returns the delivery to `PENDING_ASSIGNMENT` while the order stays active. `reassign` is a separate, explicit operation and requires the order to be `READY`.
- A driver failure follows the unassign path; it does not cancel the order. Every unassign/reassign records a reason in `Delivery.assignmentHistory`.
- Owners are scoped to their own `restaurantId`; drivers to their assigned delivery; customers to their own orders; admins are platform-wide. `permissions.ts` mirrors these checks for UX, but the backend must enforce them again from the session.

### Role workspaces

All three operational dashboards share the primitives in `src/features/dashboard` (`DashboardShell`, `DashboardPageHeader`, `StatCard`, `StatusBadge`, `DashboardPanel`, `FilterTabs`, `ConfirmDialog`) and keep their pages, hooks and components inside their own feature directory.

| Workspace | Route family | Purpose |
| --- | --- | --- |
| Restaurant owner | `/restaurant/*` | Overview, order queue, order detail. Actions are limited to accept/reject/prepare/ready. |
| Driver | `/driver/*` | Overview, active delivery with demo map, history and availability. |
| Admin | `/admin/*` | Control room, account review, driver capacity, delivery assignment, read-only orders. |

Each workspace owns its layout and query hooks; none imports another workspace's pages. Data still flows through the shared services, so replacing mocks with HTTP requires no dashboard changes. Confirmation dialogs are used for destructive or irreversible actions (reject/suspend, unassign/reassign, delivery completion).

### Real-time tracking preparation

`Delivery` stores `estimatedArrivalAt` and the latest `driverLocation`. `DriverLocation` is `Coordinates` plus `driverId`, optional `deliveryId`, heading, speed and `updatedAt`. `DriverService.updateLocation()` and `DeliveryService.updateLocation()` accept mock coordinates today; `TrackingService.subscribe()` is the future SSE/WebSocket boundary. The demo continues to report `live: false` and never requests browser location permission.

---

## 7. Error handling

`ApiClient` normalises transports into `ApiError`:

| Situation | Code | Status |
| --- | --- | --- |
| Non-2xx with JSON error | server `code` or `http_<status>` | actual |
| Timeout | `request_timeout` | 408 |
| Caller aborted | `request_aborted` | 0 |
| Network/DNS/CORS | `network_error` | 0 |
| Session invalid | `unauthorized` (emitted event) | 401 |

UI rules:

- Query errors render `ErrorState` with a retry action.
- Form submissions render `FormAlert` and field-level `details` where mapped.
- No raw server stack or HTML is rendered.
- 404 for an unknown order is a friendly state with a link to the demo order.
- Toasts are used for successful mutations (`Saved`, `Copied`, `Signed out`).

---

## 8. Rendering, performance and loading

- **SPA, client-rendered.** Vite builds static assets; the host must rewrite unknown paths to `index.html`.
- **Route-level code splitting** keeps the initial bundle focused on the shell and home page.
- **Skeletons** match final layout dimensions to avoid cumulative layout shift.
- **Images** declare intrinsic `width`/`height`; hero and above-the-fold images use `priority` (eager), everything else lazy-loads.
- **Fonts** are self-hosted, subset and preloaded; no Google Fonts connection.
- **CLS control:** explicit aspect ratios for media, reserved heights for controls, no late-injected banners above content.
- **Animation:** GSAP is loaded through the home feature rather than globally; section reveals use a single observer per wrapper.

### Vite configuration

```ts
alias: { '@': './src' }
server: { host: '127.0.0.1', port: 5173 }
preview: { host: '127.0.0.1', port: 4173 }
build: { sourcemap: false, chunkSizeWarningLimit: 900 }
```

---

## 9. Styling conventions

- Tailwind utilities first; shared patterns (`shell`, `section`, `eyebrow`, `link-underline`, `arch-frame`, `surface-grain`) live in `@layer components`.
- Conditional classes use `cn()` (`clsx` + `tailwind-merge`).
- Tokens only: no arbitrary hex in components; arbitrary values are limited to one-off sizes/positions.
- Component-local class maps (e.g. `Button` variants) keep long Tailwind strings readable.
- Global CSS is limited to resets, focus, selection, autofill, scrollbar helpers, font faces and motion preferences.
- Do not add a second icon set or CSS framework.

---

## 10. Image pipeline

```text
scripts/build-assets.mjs
  ├─ source list: key, Unsplash id, folder, ratio, alt, credit
  ├─ download to OS temp
  ├─ sharp: resize + crop + WebP
  ├─ emit 2–3 widths per asset into public/assets/<folder>/
  └─ write src/config/image-manifest.json

App
  └─ <Image imageKey="..." />
       ├─ imageUrl / imageSrcSet / imageAlt
       ├─ intrinsic width + height
       ├─ loading="lazy" unless priority
       └─ onError → /assets/placeholder-food.svg
```

The manifest is committed, so the app builds without network access. `npm run assets` is only needed when adding or changing photography.

---

## 11. Environment and composition root

`src/config/env.ts` parses once:

```ts
dataSource = VITE_DATA_SOURCE === 'http' || 'mock'
           ?? (VITE_API_BASE_URL ? 'http' : 'mock')

useMocks = dataSource === 'mock' || !apiBaseUrl
```

`src/services/index.ts` selects implementations:

```ts
export const services: Services = env.useMocks
  ? { auth: new MockAuthService(), /* ... */ }
  : { auth: new HttpAuthService(apiClient), /* ... */ };
```

The rest of the app imports `services` and the interfaces only. It never imports a mock class directly.

`src/services/api/index.ts` constructs the singleton `ApiClient` with base URL, timeout and token getter.

---

## 12. Build and deployment

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run preview
```

Output: `dist/` (static HTML, hashed JS/CSS, fonts and images copied from `public/`).

Deployment checklist:

1. Serve `dist/` over HTTPS.
2. Rewrite all non-file paths to `/index.html`.
3. Set long-lived immutable caching for `/assets/*` and `/fonts/*`; no-cache for `index.html`.
4. Add security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (no geolocation needed for the demo map).
5. Configure `VITE_API_BASE_URL`, `VITE_DATA_SOURCE=http`, and CORS with credentials if cookies are used.
6. Never expose server secrets in `VITE_*` variables; they are public by definition.

---

## 13. Decisions and trade-offs

| Decision | Why | Cost |
| --- | --- | --- |
| Service interfaces + factory | Backend-ready without UI rewrites | More files than a direct fetch |
| TanStack Query | Cache, retries, invalidation, loading states | A provider and key discipline |
| Zustand for cart/filters | Small, typed, no context re-render cost | Another state tool |
| Mock delay | Realistic loading/skeleton review | Slightly slower demo |
| Real screenshots for own pages | Honest reference of the shipped UI | Large documentation files |
| HTML mockups for teammate pages | Full-page, consistent design without fake routes | Requires a local static server |
| Hand-drawn SVG map | No token, no GPS, honest demo | Not a real map provider |
| No placeholder routes | Meets the “only six pages” constraint | 404 for teammate links |

---

## 14. Extending safely

### Add a mounted page (owner)

1. Create `src/features/<feature>/pages/<Page>.tsx` as a default export.
2. Add a lazy import and route in `src/app/router/index.tsx`.
3. Add the path to `src/config/routes.ts` (remove the `ownedBy` note if it was reserved).
4. Add data access as a service interface + mock + HTTP adapter, then wire it in `services/index.ts`.
5. Add query keys and a feature hook; keep the page free of `fetch`.
6. Update navigation only if the page is ready.

### Mount a teammate route

1. Read `docs/TEAM-HANDOFF.md` for the ownership boundary.
2. Add the page under the correct layout (customer, auth or a new dashboard layout).
3. Do not change another owner’s feature folder.
4. Add tests/review at 390/768/1440 before merging.

### Replace mock auth/tracking

- Auth: implement `AuthService` against the real endpoints, keep the same session shape, and delete `MockAuthService` from the factory.
- Admin: approve/reject accounts through `AdminService` and enforce the same rules server-side.
- Drivers/deliveries: replace `DriverService` and `DeliveryService` mocks together so assignment and availability stay transactional in the backend.
- Tracking: implement `TrackingService.subscribe` with SSE/WebSocket and set `live: true`. The UI already renders the demo label from `snapshot.live`.
