# Design References

This directory is the visual contract for the four-person Savora build. It contains **17 full-page desktop references — one for every page in the product — at 1440 px wide**, organised by owner.

They exist to keep the six implemented pages and the eleven teammate-owned pages visually consistent. They are **documentation only**.

---

## 1. Ground rules

- References are **not** application assets. Nothing in `src/` imports, references or serves a file from `docs/design-references/`.
- The Vite build never sees this directory. Only `public/` is copied into `dist/`.
- Every reference is a **full-page desktop UI mockup** at 1440 px, showing real Savora chrome, type and colour — not a wireframe, moodboard or collage.
- One reference per page. No combined sheets, no mobile/desktop pairs.
- The six pages that are actually implemented use **real screenshots of the shipped app**. The eleven teammate pages use **browser-rendered HTML/CSS mockups**, because those pages deliberately do not exist in this build.
- Reference imagery reuses the licensed photography already shipped under `public/assets/`, so the visual language matches the product.

---

## 2. Method

### Implemented pages — 6 real screenshots

Captured from the running Vite app with `scripts/cdp-shot.mjs`, a dev-only headless Chrome driver. Each capture:

1. Opens the route at a 1440 px viewport.
2. Emulates `prefers-reduced-motion: reduce` so reveals settle immediately.
3. Scrolls the full document, decodes lazy images, then captures full-page.
4. For `/profile`, seeds a demo session in `localStorage` first (`--seed-session`) so the protected page renders.

### Teammate pages — 11 browser-rendered mockups

Standalone HTML inside `_src/`, sharing `mock.css` and `mock.js`:

- `mock.css` defines the same tokens as `tailwind.config.ts`: ivory canvas, cream surfaces, olive ink, terracotta actions, gold accents, DM Serif Display + Inter.
- `mock.js` injects the shared announcement bar, navbar, footer, dashboard sidebar and topbar, plus inline Lucide-style icons.
- Each page composes real content and states from its brief: cart lines and totals, checkout sections, order confirmation, order history, five dashboard screens, restaurant listing and restaurant detail.
- The mockups are rendered through the same headless Chrome pipeline and cropped to full page.

Absolute paths such as `/public/assets/...` and `/public/fonts/...` mean the **repository root must be the web root**. That is why `scripts/design-server.mjs` exists.

---

## 3. Complete mapping

### Team Member 1 — foundation, home, auth, profile, tracking

| # | Reference | Page | Route | Source | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `my-pages/01-home.png` | Home | `/` | App screenshot | Full discovery page: hero, categories, restaurants, dishes, offers, delivery story, CTA |
| 2 | `my-pages/02-login.png` | Login | `/login` | App screenshot | Split layout, demo credentials disclosure, validation states |
| 3 | `my-pages/03-register.png` | Register | `/register` | App screenshot | Account creation with demo disclosure |
| 4 | `my-pages/04-forgot-password.png` | Forgot password | `/forgot-password` | App screenshot | Generic, non-enumerating confirmation |
| 5 | `my-pages/05-profile.png` | Profile | `/profile` | App screenshot, seeded session | Personal info, addresses, preferences, read-only payment methods |
| 6 | `my-pages/06-order-tracking.png` | Order tracking | `/orders/ord_10482` | App screenshot | Demo map, timeline, driver card, receipt |

### Team Member 2 — cart and order flow

| # | Reference | Page | Route | Source | Notes |
| --- | --- | --- | --- | --- | --- |
| 7 | `cart-order/01-cart.png` | Cart | `/cart` | `_src/cart.html` | Line items, quantity controls, coupon, totals |
| 8 | `cart-order/02-checkout.png` | Checkout | `/checkout` | `_src/checkout.html` | Delivery address, time slot, tip, demo payment |
| 9 | `cart-order/03-order-confirmation.png` | Order confirmation | `/order-confirmation/SV-10482` | `_src/order-confirmation.html` | Confirmation hero, next steps, order summary |
| 10 | `cart-order/04-order-history.png` | Order history | `/orders` | `_src/order-history.html` | Past orders, reorder affordance, empty-state guidance |

### Team Member 3 — restaurant dashboard

| # | Reference | Page | Route | Source | Notes |
| --- | --- | --- | --- | --- | --- |
| 11 | `restaurant-dashboard/01-overview.png` | Overview | `/restaurant/dashboard` | `_src/dashboard-overview.html` | KPIs, revenue chart, live orders |
| 12 | `restaurant-dashboard/02-orders.png` | Orders | `/restaurant/orders` | `_src/dashboard-orders.html` | Order queue, status columns, filters |
| 13 | `restaurant-dashboard/03-menu.png` | Menu manager | `/restaurant/menu` | `_src/dashboard-menu.html` | Menu table, availability, inline actions |
| 14 | `restaurant-dashboard/04-categories.png` | Categories | `/restaurant/categories` | `_src/dashboard-categories.html` | Category cards, ordering, item counts |
| 15 | `restaurant-dashboard/05-settings.png` | Settings | `/restaurant/settings` | `_src/dashboard-settings.html` | Restaurant profile, hours, delivery zones |

### Team Member 4 — restaurant discovery

| # | Reference | Page | Route | Source | Notes |
| --- | --- | --- | --- | --- | --- |
| 16 | `restaurant-discovery/01-restaurants.png` | Restaurant listing | `/restaurants` | `_src/restaurants.html` | Search, filters, sort, result grid |
| 17 | `restaurant-discovery/02-restaurant-details.png` | Restaurant details | `/restaurants/saffron-and-oak` | `_src/restaurant-details.html` | Hero, menu sections, restaurant sidebar |

**Totals:** 17 references · 6 real screenshots · 11 rendered mockups · 6 mounted routes · 11 reserved routes.

Every mounted route is listed in `src/config/routes.ts`. Reserved routes are declared there but intentionally **not** mounted in `src/app/router/index.tsx`; visiting one renders the ownership-aware 404.

---

## 4. Viewing the references

### Images

Open any PNG directly, or serve the repository so relative links resolve:

```bash
npm run design:serve
```

Then browse, for example:

```text
http://127.0.0.1:4318/docs/design-references/my-pages/01-home.png
```

### Interactive mockups

The HTML sources are best reviewed live, where focus states, hover styles and layouts can be inspected:

```text
http://127.0.0.1:4318/docs/design-references/_src/restaurants.html
http://127.0.0.1:4318/docs/design-references/_src/cart.html
http://127.0.0.1:4318/docs/design-references/_src/dashboard-overview.html
```

`/` on the design server redirects to the restaurant listing mockup.

Use a **1440 px wide** viewport. The mockups are desktop compositions; they are references, not a responsive deliverable (the six real pages are separately validated at 390, 768 and 1440 px).

---

## 5. Regenerating

### App screenshots

Start the app, then capture each route:

```bash
npm run dev
```

```bash
node scripts/cdp-shot.mjs --url http://127.0.0.1:5173/ --width 1440 --height 900 --full --wait 1800 --port 9401 --out docs/design-references/my-pages/01-home.png
node scripts/cdp-shot.mjs --url http://127.0.0.1:5173/login --width 1440 --height 900 --full --port 9402 --out docs/design-references/my-pages/02-login.png
node scripts/cdp-shot.mjs --url http://127.0.0.1:5173/register --width 1440 --height 900 --full --port 9403 --out docs/design-references/my-pages/03-register.png
node scripts/cdp-shot.mjs --url http://127.0.0.1:5173/forgot-password --width 1440 --height 900 --full --port 9404 --out docs/design-references/my-pages/04-forgot-password.png
node scripts/cdp-shot.mjs --url http://127.0.0.1:5173/profile --width 1440 --height 900 --full --seed-session --port 9405 --out docs/design-references/my-pages/05-profile.png
node scripts/cdp-shot.mjs --url http://127.0.0.1:5173/orders/ord_10482 --width 1440 --height 900 --full --wait 1800 --port 9406 --out docs/design-references/my-pages/06-order-tracking.png
```

Use a **different `--port` per concurrent run**. The script creates a temporary Chrome profile for each capture.

### Mockups

Serve the repo, then capture the rendered HTML:

```bash
npm run design:serve
```

```bash
node scripts/cdp-shot.mjs --url http://127.0.0.1:4318/docs/design-references/_src/cart.html --width 1440 --height 900 --full --wait 900 --port 9411 --out docs/design-references/cart-order/01-cart.png
```

Repeat for each file, incrementing `--port`. Or use the mapping table: the `Source` column is the HTML file, and the reference path is the output.

### Compression

Reference PNGs are palette-compressed after capture to keep the documentation folder light:

```js
import sharp from 'sharp';
await sharp(source)
  .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
  .toFile(destination);
```

Re-capture before compressing if you need to edit a reference; do not treat the compressed PNG as a source.

### Fonts and images in mockups

The mockups depend on:

- `public/fonts/*.woff2`
- `public/assets/restaurants/*.webp`
- `public/assets/products/*.webp`
- `public/assets/banners/*.webp`

If `npm run assets` changes filenames, update the mockup `src` paths as well. They are documentation, not manifest-driven.

---

## 6. Known caveats

- **The six app screenshots must be recaptured after UI changes.** They are snapshots, not live views. Button colours, copy and imagery can drift.
- **Mockups are static.** Interactions are illustrative; the dashboard filters, cart steppers and checkout forms do not submit anywhere.
- **Mockup photography is shared with the app.** A restaurant image in a teammate mockup is a licensed stock photo, not a photograph of a real partner.
- **The mockups use absolute `/public/...` paths.** Opening the HTML with `file://` will show broken images and fonts. Always use `npm run design:serve` or another server rooted at the repository.
- **Dashboard numbers, revenue and order volumes are invented** for composition. They are not analytics and must not be treated as product requirements.
- **The 11 teammate routes do not exist in the app.** If a reference links to another mockup, that link only works inside `_src`; it is not an app route.
- **Colour drift:** the mockups were drawn with the original terracotta `#C65D3B` for primary buttons, while the shipped app now uses `terracotta-600` (`#A94B2D`) for text-bearing actions to meet AA contrast. The difference is small but present; treat the app as the source of truth for accessible colour.
- **No dark mode.** The system is light-only by design.
- **References are desktop-only.** Responsive behaviour is documented in `docs/DESIGN-SYSTEM.md` and verified on the six implemented pages, not in the mockups.

---

## 7. Adding a reference

1. Choose the owner folder and the next number: `my-pages/`, `cart-order/`, `restaurant-dashboard/`, `restaurant-discovery/`.
2. Build the page as a full 1440 px composition using the Savora tokens — not a wireframe.
3. If it is a teammate page, add `<name>.html` under `_src/` and reuse `mock.css` + `mock.js`.
4. Capture it with `scripts/cdp-shot.mjs`, `--width 1440`, full page.
5. Compress the PNG.
6. Add a row to the mapping table in this document and to `docs/TEAM-HANDOFF.md` if ownership changes.
7. Confirm `grep -r "design-references" src/` returns nothing.

---

## 8. Why this approach

| Alternative | Why it was rejected |
| --- | --- |
| Only screenshots of implemented pages | Leaves 11 pages with no visual contract |
| Wireframes for teammate pages | Not enough fidelity to align typography, spacing and chrome |
| Mount placeholder routes and screenshot them | Violates the “six pages only” constraint and ships fake pages |
| One giant collage | Not one reference per page; hard to review and hand off |
| Import references as app images | Mixes documentation with product assets and bloats the bundle |
| External design tool links | Not self-contained, may expire, needs accounts |

The chosen split — **real screenshots where code exists, rendered HTML where it does not** — keeps the reference set honest, reviewable and consistent without pretending the missing pages are built.
