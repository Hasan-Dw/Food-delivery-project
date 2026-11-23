# Team Handoff

Savora is a four-person frontend build. This repository contains **Team Member 1’s six pages** plus the shared foundation the other three owners build on. The other eleven pages are intentionally not mounted — but their routes, design references and shared contracts are ready.

Read this before adding a route or changing a shared file.

---

## 1. Ownership

| Owner | Module | Pages | Route prefixes | Design references |
| --- | --- | --- | --- | --- |
| **TM1** | Foundation, discovery home, auth, profile, tracking | 6 | `/`, `/login`, `/register`, `/forgot-password`, `/profile`, `/orders/:orderId` | `docs/design-references/my-pages/` |
| **TM2** | Cart & order flow | 4 | `/cart`, `/checkout`, `/order-confirmation/:orderId`, `/orders` | `docs/design-references/cart-order/` |
| **TM3** | Restaurant dashboard | 5 | `/restaurant/dashboard`, `/restaurant/orders`, `/restaurant/menu`, `/restaurant/categories`, `/restaurant/settings` | `docs/design-references/restaurant-dashboard/` |
| **TM4** | Restaurant discovery | 2 | `/restaurants`, `/restaurants/:restaurantId` | `docs/design-references/restaurant-discovery/` |

Total: **17 pages**, **17 references**, **6 mounted** in this build.

### Route status

```text
Mounted by TM1
  /                              HomePage
  /login                         LoginPage
  /register                      RegisterPage
  /forgot-password               ForgotPasswordPage
  /profile                       ProfilePage            (protected)
  /orders/:orderId               OrderTrackingPage      (public)

Reserved — not mounted
  /cart                          TM2
  /checkout                      TM2
  /order-confirmation/:orderId   TM2
  /orders                        TM2 (order history)
  /restaurant/dashboard          TM3
  /restaurant/orders             TM3
  /restaurant/menu               TM3
  /restaurant/categories         TM3
  /restaurant/settings           TM3
  /restaurants                   TM4
  /restaurants/:restaurantId     TM4
```

The constants already exist in `src/config/routes.ts`. Do **not** create placeholder pages “just so the link works”; the current 404 is deliberate and explains ownership.

---

## 2. What TM1 has already built for you

### Shared UI

`src/components/ui` — `Button`, `ButtonLink`, `Input`, `Textarea`, `Select`, `Checkbox`, `Badge`, `Avatar`, `Rating`, `Image`, `Skeleton`, `StatePanel` (`EmptyState`, `ErrorState`), `QuantityStepper`, `Reveal`, `SectionHeading`, `FormAlert`, `Toaster`, `Logo`.

`src/components/shared` — `Navbar`, `AnnouncementBar`, `LocationMenu`, `SearchBar`, `AccountMenu`, `CartButton`, `MobileMenu`, `Footer`.

Use these before creating new primitives. If a new variant is needed, extend the shared component rather than forking it.

### Data boundaries

- `src/services/*/*Service.ts` — interfaces.
- `src/services/*/Http*Service.ts` — HTTP adapters already shaped to the API.
- `src/mocks/services/Mock*Service.ts` — demo implementations.
- `src/services/index.ts` — composition root.
- `src/services/api/client.ts` — timeout, bearer token, errors, 401.
- `src/types/models.ts` — domain contracts.
- `src/lib/query-keys.ts` — query keys.

Do not call `fetch` in a page. Add a service + mock + HTTP adapter, then a feature hook.

### Shared client state

| Store | API | Intended consumer |
| --- | --- | --- |
| `useCartStore` | `addProduct`, `removeItem`, `updateQuantity`, `applyCoupon`, `removeCoupon`, `clear`; selectors `selectCartCount`, `selectCartSubtotal`; `calculateCartTotals` | TM2 cart, checkout, navbar badge |
| `useDiscoveryStore` | `search`, `categorySlug`, `setSearch`, `setCategory`, `reset` | TM4 listing; already used by home |
| `useLocationStore` | `areaId`, `setArea`, `useSelectedArea` | Navbar, home, future listing |
| `useToastStore` | `notify({ tone, title, description })` via `useToast()` | All owners |

Cart is persisted at `savora.cart.v1`. It is currently single-restaurant; adding a product from a different restaurant replaces the cart and reports `replacedRestaurant: true`.

### Assets

- `src/config/image-manifest.json` — 51 assets with widths, dimensions, alt and credit.
- `src/config/images.ts` — `imageUrl`, `imageSrcSet`, `imageAlt`, `imageAspect`.
- `src/components/ui/Image.tsx` — responsive WebP + fallback.
- Rebuild only if adding sources: `npm run assets`.

### Reference mockups

All 17 references are documentation-only. The 11 teammate references were built as standalone HTML/CSS in `docs/design-references/_src` so every page shares the same chrome, type and colour system. They are **not** application code and must not be imported into `src/`.

```bash
npm run design:serve
# http://127.0.0.1:4318/docs/design-references/_src/cart.html
```

See `docs/DESIGN-REFERENCES.md` for the mapping.

---

## 3. Shared files: coordinate before editing

These are cross-owner contracts. A change here can break every module.

| File | Why it is shared | Rule |
| --- | --- | --- |
| `src/app/router/index.tsx` | The only route table | Add your routes; don’t remove or reorder others |
| `src/config/routes.ts` | Path constants | Add constants; keep existing values stable |
| `src/config/navigation.ts` | Nav + `soon` markers | Remove `soon` only when the page is mounted |
| `src/services/index.ts` | Mock/HTTP factory | Add a service to **both** branches and the interface |
| `src/types/models.ts` | Domain contracts | Extend, don’t rename existing fields |
| `src/services/api/client.ts` | All HTTP | Changes affect auth, errors and every service |
| `src/app/providers/` | Query/auth lifecycle | Announce changes; test 401 + refresh |
| `src/components/ui/*`, `src/components/shared/*` | Visual language | Extend variants; don’t fork |
| `src/stores/cart-store.ts` | TM2’s boundary | TM2 owns extensions; announce shape changes |
| `tailwind.config.ts`, `src/styles/index.css` | Design tokens | Add tokens; don’t replace colours casually |
| `src/config/image-manifest.json` | Image keys | Add via `npm run assets`; don’t hand-edit paths |
| `docs/` | Shared documentation | Update the relevant doc with your page |

If two owners need the same new component or field, land it once in the shared layer.

---

## 4. Integration steps by owner

### TM2 — Cart & order flow

Reference: `docs/design-references/cart-order/01-cart.png` … `04-order-history.png`.

1. Create `src/features/cart`, `src/features/checkout`, `src/features/orders` with page files.
2. Mount under `CustomerLayout` in `src/app/router/index.tsx`:

```tsx
<Route path={ROUTES.cart} element={<CartPage />} />
<Route path={ROUTES.checkout} element={<CheckoutPage />} />
<Route path={ROUTES.orderConfirmation()} element={<OrderConfirmationPage />} />
<Route path={ROUTES.orderHistory} element={<OrderHistoryPage />} />
```

3. Keep `/orders/:orderId` (tracking, TM1) working. React Router ranks the static `/orders` above the dynamic route, but test both.
4. Use `useCartStore` rather than creating a second cart. Totals come from `calculateCartTotals`; fees/coupons are demo values.
5. Add `CartService` / `createOrder` only if the backend exists; otherwise extend `MockOrderService` and keep the interface.
6. The checkout page must not collect real card data. If you add a payment form, label it demo and keep it out of state/logs.
7. On placing an order, navigate to `/order-confirmation/:orderId` or `/orders/:orderId`; reuse TM1’s tracking page for the live view.

**Do not** change `CartItem` or `CartTotals` without telling TM1 and TM4, who read the navbar badge.

### TM3 — Restaurant dashboard

Reference: `docs/design-references/restaurant-dashboard/01-overview.png` … `05-settings.png`.

1. Create a `DashboardLayout` in `src/app/layouts` (sidebar + topbar). Keep the customer navbar out of it.
2. Mount a nested branch:

```tsx
<Route path="/restaurant" element={<DashboardLayout />}>
  <Route path="dashboard" element={<DashboardOverviewPage />} />
  <Route path="orders" element={<DashboardOrdersPage />} />
  <Route path="menu" element={<DashboardMenuPage />} />
  <Route path="categories" element={<DashboardCategoriesPage />} />
  <Route path="settings" element={<DashboardSettingsPage />} />
</Route>
```

3. Add a **role guard**. `ProtectedRoute` only checks that a customer session exists; it does not verify `user.role === 'restaurant_owner'`. Add a separate guard or extend the route wrapper deliberately.
4. The dashboard has its own navigation; do not reuse the marketplace footer.
5. All dashboard numbers in the references are illustrative. Label demo data and keep mutations behind services.
6. Follow the same visual tokens, but denser type and tables are allowed. See `docs/DESIGN-SYSTEM.md` §4–6.

### TM4 — Restaurant discovery

Reference: `docs/design-references/restaurant-discovery/01-restaurants.png`, `02-restaurant-details.png`.

1. Create `src/features/restaurants` with listing and detail pages.
2. Mount:

```tsx
<Route path={ROUTES.restaurants} element={<RestaurantsPage />} />
<Route path={ROUTES.restaurantDetails()} element={<RestaurantDetailsPage />} />
```

3. Read filters from `useDiscoveryStore` so the home search and listing agree. Read the area from `useSelectedArea`.
4. Use `services.restaurants.list({ search, category, sort, page, perPage })`; the HTTP adapter already sends those query params.
5. Detail pages use `services.restaurants.getById(idOrSlug)` and `services.products.listByRestaurant(id)`.
6. Remove `soon: true` from the footer “All restaurants” item once the page is live.
7. Do not add a second search store or a second restaurant card; extend `RestaurantCard` if needed.

---

## 5. Route and navigation conventions

- Add every path to `ROUTES` first; never hardcode strings in pages.
- Keep public pages public (tracking is shareable). Use `ProtectedRoute` only for account pages.
- Auth pages live under `AuthLayout`; marketplace pages under `CustomerLayout`; dashboard pages under their own layout.
- `soon: true` means “owned but not mounted”. Remove it only after the route works at 390/768/1440.
- The 404 is not a catch-all for broken links inside your own module. Fix those links.

---

## 6. Visual and content conventions

- Reuse the tokens and primitives; no new palette, icon set or font.
- Serif for headings, Inter for controls and dense data.
- Small text uses `olive-500` or darker; `olive-400` is decorative only.
- Primary actions use `terracotta-600` with cream text.
- Every meaningful image needs manifest alt text; decorative images use `alt=""`.
- Demo content must say **demo**. Never imply live GPS, real payment or real security.
- Prices use `formatCurrency`, times use `formatTime` / `formatEta` from `src/lib/format.ts`.
- Loading, empty and error states are required, not optional polish.
- No placeholder pages, `TODO` routes or “coming soon” screens.

---

## 7. Definition of done

For every page:

- [ ] Route constant added and mounted once, under the correct layout.
- [ ] Page is code-split (`React.lazy`) and has a document title.
- [ ] Data comes through a hook → service; no `fetch` in the page.
- [ ] Loading, empty and error states implemented.
- [ ] Keyboard-only pass: focus visible, Escape closes overlays, focus returns.
- [ ] Checked at 390, 768 and 1440 px with no horizontal overflow.
- [ ] `prefers-reduced-motion` respected.
- [ ] Contrast checked for all small text; no colour-only status.
- [ ] Images use `Image` with alt and responsive sizes.
- [ ] Demo boundaries are labelled.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` pass.
- [ ] A full-page 1440 reference screenshot is added to the correct `docs/design-references/` folder.
- [ ] `README.md` and `docs/DESIGN-REFERENCES.md` mapping updated.
- [ ] No other owner’s files were changed without agreement.

---

## 8. Review checklist for the integrator

- [ ] Only the intended routes are mounted; reserved routes still 404.
- [ ] No design reference is imported by `src/`.
- [ ] No hardcoded API URL, token or secret in source.
- [ ] `VITE_DATA_SOURCE=mock` and `http` both boot without console errors.
- [ ] 401 clears session once and redirects to login.
- [ ] Cart badge updates across pages.
- [ ] Tracking link works logged-out.
- [ ] Profile redirects back after login.
- [ ] Production preview serves deep links (host rewrite configured).
- [ ] Lighthouse accessibility has no serious/critical findings.

---

## 9. Known gaps and deliberate boundaries

| Gap | Owner / note |
| --- | --- |
| Mock auth is not secure | Replace with backend; keep disclosure until then |
| Demo map is an SVG, no GPS | TM1 boundary; swap behind `TrackingSnapshot` |
| Payment methods are read-only | No payment provider in this build |
| Cart/checkout pages absent | TM2 |
| Dashboard absent | TM3; needs a role guard |
| Restaurant listing/detail absent | TM4 |
| No automated component/E2E tests | Manual + typecheck/lint/build only |
| No backend | HTTP adapters are the contract |
| Images are stock | Unsplash License; not real partner photography |
| `VITE_MAP_PROVIDER` / `VITE_MAP_TOKEN` reserved | Not read by `DeliveryMap` yet |

---

## 10. Getting unstuck

1. Read `docs/ARCHITECTURE.md` for the data flow.
2. Read `docs/BACKEND-INTEGRATION.md` for the endpoint you need.
3. Check `src/types/models.ts` before inventing a shape.
4. Check `docs/DESIGN-SYSTEM.md` before inventing a style.
5. If a route 404s, confirm it is mounted in `src/app/router/index.tsx` — not just declared in `routes.ts`.
6. If images are missing, confirm the key exists in `image-manifest.json` and the file exists under `public/assets/<folder>/`.
7. If a mock update disappears on reload, remember only the session and cart persist; mock profile/address changes are in-memory by design. Connect the service to a backend for real persistence.
