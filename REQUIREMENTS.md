# Food Delivery Web App — Frontend Requirements & One-Week Execution Plan

> **Project type:** Food delivery web application (frontend only)  
> **Frontend stack:** React + TypeScript + Tailwind CSS  
> **Team:** Hassan , Ahmad , Mohammad , Lama  
> **Delivery target:** 7 calendar days  
> **Status:** Initial requirements baseline; confirm assumptions with the team before implementation.

---

## 1. Project Overview

Build a responsive food delivery website where customers can discover restaurants and meals, view item details, manage a cart, complete a simulated checkout, and views their orders. Include a separate admin dashboard for managing the demo catalogue and viewing orders.

This is a **frontend-only milestone**. Use local mock data and browser storage where appropriate. No real payments, authentication security, order processing, or backend persistence will be implemented in this week.

### 1.1 Goals

- Deliver a coherent, navigable, responsive user experience.
- Demonstrate the main customer journey from browsing to a simulated order confirmation.
- Provide an admin dashboard with useful overview cards, tables, and basic management interactions.
- Use shared components, typed data models, consistent routing, and maintainable React code.
- Make it easy to connect a real API in a later phase.

### 1.2 Assumptions to confirm on Day 1

1. The site is a single-city demonstration; delivery zones are represented by sample data.
2. The interface language for the first release is English. Add RTL/localization only if the team explicitly chooses it.
3. Checkout is simulated. Do not collect or store real payment-card details.
4. Login and registration are demo flows only; they do not provide real security.
5. The dashboard is an **admin dashboard**, not a restaurant-owner or courier dashboard.
6. Use a small, curated mock dataset instead of spending time on a backend.
7. Use a simple visual direction: clean food photography, warm accent color, readable typography, clear spacing, and accessible contrast.

---

## 2. Scope

### 2.1 In scope for the one-week frontend milestone

- Responsive public layout and navigation.
- Home page with hero section, categories, featured restaurants, and popular meals.
- Restaurant listing and restaurant detail/menu pages.
- Search and category filtering using mock data.
- Meal detail view or modal, including quantity/add-to-cart interaction.
- Cart page or drawer with quantity changes, item removal, subtotal, delivery fee, and total.
- Simulated checkout form with client-side validation.
- Order confirmation page and order history using local demo data.
- Demo login/register UI, if time permits; no real authentication.
- Admin dashboard with overview cards, order table, menu/product table, and basic mock CRUD interactions.
- Loading, empty, error, and success states where relevant.
- Responsive behavior for mobile, tablet, and desktop.
- Basic accessibility, linting, and a short README/run guide.

### 2.2 Explicitly out of scope

- Backend/API implementation and database integration.
- Real authentication, authorization, password recovery, or secure sessions.
- Real payment gateway, refunds, or payment-card collection.
- Live GPS tracking, maps, courier assignment, or real-time notifications.
- Real SMS/email delivery.
- Production deployment pipeline unless already prepared.
- Complex multi-restaurant checkout, promotions engine, loyalty points, reviews moderation, or analytics integrations.
- Security claims based on frontend-only route guards.

### 2.3 Definition of “done”

A feature is done when:

- It works in the agreed browser sizes.
- It uses typed data and shared UI conventions.
- It has sensible empty/error/validation states.
- Navigation and buttons do something meaningful (or are clearly marked as unavailable).
- It has been reviewed by at least one teammate other than its author.
- It does not break the main customer flow or dashboard.
- The code is merged into the shared branch.

---

## 3. User Roles

### Customer

Can browse restaurants and meals, search/filter, add meals to a cart, edit the cart, submit a simulated order, and view demo order history.

### Administrator

Can view dashboard summary cards, inspect orders, update an order's demo status, and add/edit/delete menu items in local mock state.

### Guest

Can browse and build a cart without signing in. For this milestone, checkout may ask for contact and delivery details without requiring a real account.

---

## 4. Functional Requirements

Priority key: **P0 = must-have**, **P1 = should-have if time allows**, **P2 = future phase**.

### 4.1 Shared layout and navigation

- **P0** Header with brand/logo, navigation, search entry point, cart count, and responsive mobile menu.
- **P0** Footer with basic links and contact/demo information.
- **P0** Consistent page container, spacing, typography, buttons, inputs, badges, and cards.
- **P0** Active navigation state and useful not-found page.
- **P1** Toasts for add-to-cart, save, and delete feedback.

### 4.2 Home page

- **P0** Hero section with clear value proposition and primary call to action.
- **P0** Search field for restaurant or meal name.
- **P0** Category chips/cards (e.g., Pizza, Burgers, Healthy, Desserts).
- **P0** Featured restaurants and popular meals.
- **P0** Restaurant/meal cards show image, name, rating, delivery estimate, and price where applicable.
- **P1** Promotional banner and “how it works” section.
- **P0** Responsive grid/stacked layout.

### 4.3 Restaurant listing and search

- **P0** Display restaurants from mock data.
- **P0** Search by restaurant name or meal name.
- **P0** Filter by category/cuisine.
- **P1** Sort by rating, delivery time, or name.
- **P0** Empty state when no results match.
- **P0** Clear filters action.

### 4.4 Restaurant details and menu

- **P0** Restaurant header with name, cover image, rating, cuisine, delivery estimate, and fee.
- **P0** Menu grouped by category.
- **P0** Meal cards with image, title, short description, and price.
- **P0** Add item to cart.
- **P1** Meal detail modal/page with quantity selection and optional notes.
- **P0** Clear unavailable/empty menu state.

### 4.5 Cart

- **P0** Add items and update cart badge.
- **P0** Increase/decrease quantity and remove items.
- **P0** Show subtotal, delivery fee, and total.
- **P0** Prevent quantities below one; removing the final item shows an empty-cart state.
- **P0** Persist cart in `localStorage` for refreshes.
- **P0** Checkout CTA routes to checkout.
- **P1** Clear-cart confirmation.

**Business rule for this milestone:** support one restaurant per cart. If a user adds an item from another restaurant, show a confirmation prompt to replace the current cart. If this is too much for the schedule, disable cross-restaurant additions with a clear message.

### 4.6 Checkout and order confirmation

- **P0** Form fields: full name, phone, delivery address, and optional delivery instructions.
- **P0** Client-side required-field validation and understandable inline errors.
- **P0** Order summary with items and total.
- **P0** Simulated “Place order” action; no real payment.
- **P0** Generate a demo order ID and navigate to confirmation.
- **P0** Save the demo order to local storage.
- **P0** Clear the cart after successful simulated order placement.
- **P0** Confirmation page shows order ID, summary, and estimated delivery window.
- **P1** Provide a link to order history.

### 4.7 Order history

- **P0** Show demo orders saved in browser storage.
- **P0** Display order ID, date, total, and status.
- **P0** Show an empty state for first-time users.
- **P1** Open order details.

### 4.8 Demo account screens

- **P1** Login and registration form UI with validation.
- **P1** Demo-only sign-in state, if required for the presentation.
- **P0** Clearly document that demo authentication is not secure and must be replaced by backend authentication.
- **P2** Password reset, social login, account settings, and secure session management.

### 4.9 Admin dashboard

The dashboard is part of the required frontend deliverable.

- **P0** Admin shell with sidebar/navigation, page title, and responsive mobile navigation.
- **P0** Dashboard overview cards:
  - Total demo orders
  - Total demo revenue
  - Pending orders
  - Number of menu items
- **P0** Recent orders table with order ID, customer, date, total, and status.
- **P0** Orders page with status badges and a status filter.
- **P0** Update demo order status (e.g., Pending → Preparing → Out for delivery → Delivered; allow Cancelled as a separate status).
- **P0** Menu/items management table with name, category, price, availability, and actions.
- **P0** Add/edit item form with validation.
- **P0** Delete item with confirmation.
- **P0** Persist dashboard demo changes in local storage or shared in-memory mock state.
- **P0** Empty states, confirmation feedback, and responsive table behavior.
- **P1** Search/filter dashboard tables.
- **P1** Simple revenue/order chart only if all P0 features are stable.
- **P2** Real roles/permissions, backend reporting, export, and audit logs.

**Admin access note:** a frontend route guard is only a navigation/demo convenience. It is not security. Real authorization must be enforced by a backend in a later phase.

---

## 5. Main Routes / Pages

Suggested routes (use React Router):

| Route                          | Page               | Priority | Notes                              |
| ------------------------------ | ------------------ | -------: | ---------------------------------- |
| `/`                            | Home               |       P0 | Hero, categories, featured content |
| `/restaurants`                 | Restaurant listing |       P0 | Search, filters, sort              |
| `/restaurants/:restaurantId`   | Restaurant detail  |       P0 | Menu and add-to-cart               |
| `/cart`                        | Cart               |       P0 | Quantity, removal, totals          |
| `/checkout`                    | Checkout           |       P0 | Validated simulated order          |
| `/order-confirmation/:orderId` | Order confirmation |       P0 | Success summary                    |
| `/orders`                      | Order history      |       P0 | Demo orders from storage           |
| `/login`                       | Login              |       P1 | Demo UI only                       |
| `/register`                    | Registration       |       P1 | Demo UI only                       |
| `/admin`                       | Dashboard overview |       P0 | Summary cards and recent orders    |
| `/admin/orders`                | Order management   |       P0 | Status changes                     |
| `/admin/menu`                  | Menu management    |       P0 | CRUD against mock state            |
| `*`                            | Not found          |       P0 | Fallback route                     |

If the team has limited time, prioritize a complete, polished customer flow plus dashboard overview, orders, and menu management over optional account features.

---

## 6. Non-Functional Requirements

### Usability and responsive design

- Support mobile (approximately 360px+), tablet, and desktop widths.
- Avoid horizontal page overflow.
- Keep important actions visible and labels understandable.
- Use consistent spacing and predictable navigation.

### Accessibility

- Use semantic HTML elements.
- Every input has a visible label.
- Buttons and links are keyboard accessible.
- Use visible focus states.
- Add useful `alt` text to meaningful images; decorative images use empty alt text.
- Do not rely on color alone for order status.
- Maintain readable contrast and sensible heading hierarchy.

### Performance

- Keep components reasonably small and avoid unnecessary dependencies.
- Use appropriately sized images and lazy-load below-the-fold images where practical.
- Avoid large animation libraries for this one-week delivery.
- Keep mock data separate from UI components.

### Maintainability

- Use TypeScript strictness where the starter project allows it.
- Define shared types for restaurants, menu items, cart lines, and orders.
- Avoid `any` unless documented and truly necessary.
- Keep business calculations outside large JSX blocks.
- Use shared components instead of duplicating cards, inputs, buttons, and badges.

### Reliability

- Handle missing IDs, empty arrays, invalid forms, and malformed local-storage data gracefully.
- Include a useful not-found route.
- Keep the app usable if optional demo data is unavailable.

---

## 7. Suggested Technology and Dependencies

Required:

- React
- TypeScript
- Tailwind CSS

Recommended if not already configured:

- Vite — development server and build tool
- React Router — client-side routing
- Lucide React — icons
- React Hook Form — optional form handling
- Zod — optional schema validation
- Recharts — optional dashboard chart, only after P0 work is complete

Do not add every optional dependency automatically. Agree on the minimal set on Day 1.

---

## 8. Suggested Project Structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers/
├── assets/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── EmptyState.tsx
│   │   └── LoadingState.tsx
│   ├── layout/
│   │   ├── PublicLayout.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── AdminLayout.tsx
│   ├── restaurants/
│   ├── menu/
│   ├── cart/
│   └── admin/
├── data/
│   ├── restaurants.ts
│   ├── menuItems.ts
│   └── orders.ts
├── features/
│   ├── cart/
│   │   ├── cart-context.tsx
│   │   ├── cart-storage.ts
│   │   └── cart-utils.ts
│   ├── orders/
│   └── admin/
├── hooks/
├── pages/
│   ├── HomePage.tsx
│   ├── RestaurantsPage.tsx
│   ├── RestaurantDetailsPage.tsx
│   ├── CartPage.tsx
│   ├── CheckoutPage.tsx
│   ├── OrderConfirmationPage.tsx
│   ├── OrderHistoryPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── admin/
├── types/
│   ├── restaurant.ts
│   ├── menu-item.ts
│   ├── cart.ts
│   └── order.ts
├── lib/
│   ├── format-currency.ts
│   ├── storage.ts
│   └── validation.ts
├── index.css
└── main.tsx
```

The team can simplify this structure if the starter repository is small. Do not create empty folders merely to match the diagram.

---

## 9. Core Data Types

Use shared types from `src/types/`. Adapt fields as needed, but agree on them before parallel implementation.

```ts
export type Restaurant = {
  id: string
  name: string
  description: string
  cuisine: string
  imageUrl: string
  rating: number
  deliveryMinutes: number
  deliveryFee: number
  isOpen: boolean
}

export type MenuItem = {
  id: string
  restaurantId: string
  name: string
  description: string
  imageUrl: string
  category: string
  price: number
  isAvailable: boolean
}

export type CartLine = {
  item: MenuItem
  quantity: number
  notes?: string
}

export type OrderStatus =
  | "Pending"
  | "Preparing"
  | "Out for delivery"
  | "Delivered"
  | "Cancelled"

export type CustomerDetails = {
  fullName: string
  phone: string
  address: string
  deliveryInstructions?: string
}

export type Order = {
  id: string
  createdAt: string
  customer: CustomerDetails
  items: CartLine[]
  subtotal: number
  deliveryFee: number
  total: number
  status: OrderStatus
}
```

### Data and state rules

- Use one shared cart state (React Context is sufficient for this project).
- Persist cart and demo orders through a small storage utility.
- Keep price calculations in utility functions, not duplicated across pages.
- Store currency formatting in one helper; agree on the demo currency on Day 1.
- Treat local storage as untrusted input: parse safely and fall back to defaults.
- Admin menu edits should update the same mock data source used by the customer pages during the current session where practical.

---

## 10. UI Components to Build Once

### Shared UI

- `Button` — variants and disabled/loading states.
- `Input` / `Textarea` — labels, errors, and focus styles.
- `Badge` — order status and availability.
- `Modal` — confirmation and item detail interactions.
- `EmptyState` — message plus optional action.
- `PageHeader` — title, description, optional action.
- `ConfirmDialog` — delete/replace-cart confirmations.
- `Toast` — optional, lightweight feedback.

### Customer components

- `RestaurantCard`
- `MenuItemCard`
- `CategoryChip`
- `SearchBar`
- `QuantityControl`
- `CartSummary`
- `OrderStatusTimeline` (optional)

### Admin components

- `AdminSidebar` / `AdminMobileNav`
- `StatCard`
- `OrdersTable`
- `MenuItemsTable`
- `StatusBadge`
- `MenuItemForm`

---

## 11. Team Responsibilities

All four team members must contribute frontend code.

### Hassan / Frontend Lead

**Primary ownership**

- Agree on requirements, routes, types, component conventions, and code review rules.
- Set up or stabilize the app shell, router, global styles, and public/admin layouts.
- Own cart state and core cart utilities, including local-storage persistence.
- Build checkout/order creation integration points or pair with Ahmad on them.
- Review pull requests and resolve integration conflicts.
- Coordinate final acceptance testing and README updates.

**Avoid becoming the bottleneck:** publish interfaces and starter components early; do not implement every page yourself.

### Ahmad / Feature Lead

**Primary ownership**

- Build the admin dashboard overview and admin layout.
- Build order management and menu management flows.
- Define reusable dashboard table/stat components.
- Coordinate mock order/menu data contracts with Hassan.
- Review dashboard responsiveness and interactions.
- Help integrate customer and admin routes near the end of the week.

### Mohammad / Customer UI

**Primary ownership**

- Build restaurant cards and category UI using agreed props.
- Build the home page content sections using provided mock data.
- Build the restaurants listing page and basic search/category filtering.
- Add empty states and responsive styling.
- Write a short manual test checklist for home/listing.

**Boundaries and support**

- Do not change shared types or routing conventions without agreement.
- Start from the approved components and data types.
- Ask for a small review early rather than waiting until the feature is complete.

### Lama / Menu UI and Forms

**Primary ownership**

- Build menu item cards and restaurant detail/menu page UI.
- Build reusable input/textarea/form field presentation (coordinate with Hassan).
- Build the demo login/register UI if time allows; otherwise improve menu states.
- Add form validation presentation based on agreed rules.
- Test mobile layouts and create a short manual checklist for restaurant/menu pages.

**Boundaries and support**

- Use the agreed `MenuItem` and `Restaurant` types.
- Do not implement real authentication.
- Coordinate component props with Ahmad/Hassan before integrating.

### Shared responsibility

- Everyone writes frontend code and participates in testing.
- Each person reviews at least one teammate's pull request.
- Senior developers pair with juniors for 15–30 minutes daily, focusing on blockers and feedback rather than taking over their tasks.
- All team members help with final bug fixing on Day 6 and Day 7.

---

## 12. One-Week Delivery Plan

Assume each person can contribute a focused workday. If the team has fewer hours, cut P1 features first. The plan is intentionally parallel, but it requires a short daily sync and stable shared interfaces.

### Day 1 — Align, scaffold, and split work

**All (30–45 minutes)**

- Confirm scope, currency, visual direction, routes, and mock-data assumptions.
- Agree on branch strategy and naming conventions.
- Review this requirements document and mark any decisions that differ.

**Hassan**

- Create/verify React + TypeScript + Tailwind setup.
- Add router, global styles, base layout, and route placeholders.
- Define types and shared conventions; push the initial working app.

**Ahmad**

- Draft admin layout and dashboard wireframe.
- Confirm the order status flow and menu management fields with Hassan.
- Create admin page skeletons and agree on table props.

**Mohammad**

- Prepare home/listing wireframe or component outline.
- Build initial `RestaurantCard` and `CategoryChip` against agreed types.

**Lama**

- Prepare restaurant/menu wireframe.
- Build initial `MenuItemCard` and form field styling against agreed types.

**Day 1 exit criteria**

- App runs locally on all four machines.
- Agreed routes and data types are committed.
- Each person has a small working component or page skeleton.
- No one is blocked waiting for another person's unfinished component.

### Day 2 — Build core page surfaces

**Hassan**

- Implement cart context/utilities and local-storage handling.
- Add shared button/input/badge primitives as needed.

**Ahmad**

- Implement admin shell, overview cards, recent orders table with mock data.
- Implement responsive sidebar/mobile navigation.

**Mohammad**

- Implement home page sections and restaurants listing with mock data.
- Add search and category filtering.

**Lama**

- Implement restaurant detail/menu layout.
- Add category grouping and add-to-cart button wiring using a temporary agreed callback if cart context is not ready.

**Day 2 exit criteria**

- Home, listing, restaurant detail, and dashboard overview render with realistic mock data.
- Shared styles and responsive foundations are in place.

### Day 3 — Connect customer journey and admin tables

**Hassan**

- Connect cart state to menu cards and header badge.
- Implement cart page behavior and total calculations.

**Ahmad**

- Implement admin orders table and status changes.
- Implement menu management table and add/edit/delete form flow with mock state.

**Mohammad**

- Finish search/filter behavior, empty states, and responsive fixes.
- Verify cards link to restaurant details.

**Lama**

- Finish menu item interactions and form field validation states.
- Pair with Hassan to connect add-to-cart behavior.

**Day 3 exit criteria**

- Add-to-cart works from restaurant pages.
- Cart quantities/removal/totals work.
- Admin orders and menu tables have working demo interactions.

### Day 4 — Checkout, order flow, and persistence

**Hassan**

- Implement checkout validation, simulated order creation, and local-storage persistence.
- Clear cart after successful order creation.

**Ahmad**

- Connect admin tables to shared demo order/menu state where practical.
- Add order status filters and confirmation for destructive actions.

**Mohammad**

- Polish home/listing UI, loading/empty states, and mobile menu.
- Test search/filter edge cases.

**Lama**

- Implement order confirmation or order history UI, pairing with Hassan on the order type.
- If order-history work is already assigned elsewhere, build login/register UI instead.

**Day 4 exit criteria**

- The customer can browse → add to cart → checkout → see confirmation.
- Demo orders appear in order history and can be inspected in admin state where supported.

### Day 5 — Complete P0 and integrate

**Hassan**

- Resolve integration issues and verify cart/checkout behavior.
- Add not-found route and safe storage parsing.

**Ahmad**

- Finish dashboard order/menu actions and responsive behavior.
- Ensure admin tables show empty states and meaningful statuses.

**Mohammad**

- Test home/listing and fix visual/responsive defects.
- Check navigation links and category filtering.

**Lama**

- Test restaurant/menu pages and forms.
- Fix keyboard/focus/label issues and missing states.

**Day 5 exit criteria**

- All P0 routes exist.
- Main customer flow and core admin workflows work end-to-end.
- No known blocker prevents a demo.

### Day 6 — QA, polish, and bug fixing

**All**

- Test the full acceptance checklist in Section 14.
- Test mobile, tablet, and desktop widths.
- Fix defects before adding optional features.

**Hassan**

- Run integration review; fix type/lint/build failures.
- Verify local-storage behavior and price calculations.

**Ahmad**

- Verify admin status changes, menu CRUD, filters, and table layouts.

**Mohammad**

- Verify search, category filtering, links, empty states, and mobile layout.

**Lama**

- Verify form errors, keyboard navigation, menu interactions, and responsive layout.

**Day 6 exit criteria**

- Production build succeeds.
- No critical/high-priority bugs remain.
- All team members have tested at least one area owned by someone else.

### Day 7 — Freeze, demo, and handoff

**All**

- Stop feature work early; only fix release-blocking issues.
- Run the full customer and admin demo flows.
- Prepare a short demo script and known-limitations list.

**Hassan**

- Final merge/release check.
- Update README setup instructions, scripts, scope, and limitations.

**Ahmad**

- Prepare the dashboard demo scenario and verify sample data.

**Mohammad**

- Verify the public landing/listing experience and collect screenshots if needed.

**Lama**

- Verify menu/checkout presentation and check for visual inconsistencies.

**Day 7 exit criteria**

- A clean clone can install and run the app using the README.
- The demo works without a backend.
- Known limitations are documented honestly.

---

## 13. Git and Collaboration Rules

Suggested lightweight workflow:

- `main` — always demoable.
- Feature branches:
  - `feat/app-shell-routing`
  - `feat/home-restaurants`
  - `feat/restaurant-menu`
  - `feat/cart-checkout`
  - `feat/admin-dashboard`
  - `feat/admin-management`
- Open small pull requests; avoid one giant PR at the end.
- At least one teammate reviews every PR; Hassan or Ahmad reviews shared architecture/state changes.
- Do not edit the same file concurrently unless pairing.
- Merge early when the agreed interface is stable.
- Keep commits focused and descriptive, e.g. `feat: add restaurant filters`.
- Run the agreed lint/typecheck/build commands before merging.
- Never commit `.env` files, credentials, or real customer data.

### Component handoff contract

Before implementing a component, agree on:

- File path and exported component name.
- Required props and shared types.
- Whether the component owns state or receives callbacks.
- Loading/empty/error states.
- Who integrates it and by what day.

Example:

```tsx
type RestaurantCardProps = {
  restaurant: Restaurant
  onSelect?: (restaurantId: string) => void
}

export function RestaurantCard({ restaurant, onSelect }: RestaurantCardProps) {
  // UI implementation
}
```

---

## 14. Acceptance Test Checklist

### Public experience

- [ ] Home page renders without errors.
- [ ] Header navigation works on desktop and mobile.
- [ ] Search finds matching restaurants or meals.
- [ ] Category filters can be applied and cleared.
- [ ] Restaurant cards open the correct detail page.
- [ ] Menu cards show name, description, image, and price.
- [ ] Adding an item updates the cart badge.
- [ ] Empty search results show a useful message.

### Cart and checkout

- [ ] Cart survives a page refresh.
- [ ] Quantity can be increased and decreased.
- [ ] Items can be removed.
- [ ] Subtotal, delivery fee, and total are correct.
- [ ] Empty cart has a clear CTA to continue browsing.
- [ ] Invalid checkout submissions show inline errors.
- [ ] Successful simulated checkout creates an order ID.
- [ ] Successful checkout clears the cart.
- [ ] Confirmation page shows the correct order summary.
- [ ] Order history displays saved demo orders.

### Admin dashboard

- [ ] `/admin` shows summary cards and recent orders.
- [ ] Admin navigation works on desktop and mobile.
- [ ] Orders table shows status clearly.
- [ ] Order status can be changed in demo state.
- [ ] Menu item can be added, edited, and deleted.
- [ ] Delete action requires confirmation.
- [ ] Admin tables handle empty data.
- [ ] Dashboard remains usable on narrow screens.
- [ ] Admin demo guard is not described as real security.

### Engineering and delivery

- [ ] TypeScript checks pass.
- [ ] Lint/build pass if configured.
- [ ] No broken links or obvious console errors.
- [ ] No accidental `any` usage without justification.
- [ ] No secrets or real customer data in the repository.
- [ ] README setup and run instructions are accurate.

---

## 15. Risks and Mitigations

| Risk                                                | Mitigation                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| One-week deadline is too short for every feature    | Freeze P0 scope; drop P1/P2 features first                                    |
| Senior developers become integration bottlenecks    | Define types/props on Day 1 and review small PRs daily                        |
| Juniors are blocked by changing interfaces          | Give bounded components and stable mock data; pair briefly each day           |
| Merge conflicts across shared files                 | Assign clear file ownership and avoid parallel edits to the same files        |
| Dashboard and customer pages use inconsistent data  | Agree on shared types and a single mock-data/state approach                   |
| Local storage contains stale or malformed data      | Parse safely and fall back to seeded demo data                                |
| Frontend-only demo is mistaken for production-ready | Document mock data, simulated checkout, and lack of real authentication       |
| Visual polish consumes the whole week               | Prioritize complete flows and consistent components over elaborate animations |

---

## 16. Daily Team Rituals

Keep meetings short because the delivery window is only one week.

- **Start of day (10 minutes):** each person says what they will finish, what is blocked, and which interface they need.
- **Midday (5–10 minutes):** resolve blockers and confirm integration contracts.
- **End of day (10 minutes):** demo working code, merge safe changes, and update the task board.
- **Pull request target:** review within a few hours where practical, not at the end of the week.

Suggested board columns: `Backlog` → `Ready` → `In Progress` → `Review` → `Done`.

Every task should have one owner, a clear acceptance condition, and a target day.

---

## 17. Recommended Minimum Demo Script

1. Open the home page and browse featured restaurants.
2. Search for a restaurant or filter by category.
3. Open a restaurant and add two menu items.
4. Open the cart, change a quantity, and verify totals.
5. Complete checkout using fake/demo contact information.
6. Show the confirmation page and order history.
7. Open `/admin` and show the overview cards.
8. Open the orders page and update the demo order status.
9. Open menu management and add/edit/delete a sample item.
10. Refresh the page to demonstrate whichever local-storage changes are persisted.

Use only fictitious customer details in the demo.

---

## 18. Final Recommendation

The safest one-week strategy is **not** to build every idea that a food-delivery platform might eventually need. Deliver one complete customer journey and a credible admin dashboard first.

**P0 release target:** Home + restaurant listing/search + restaurant/menu details + cart + simulated checkout/confirmation + order history + admin overview + order management + menu management.

If the schedule slips, defer registration/login, charts, advanced sorting, and animations. Keep all four developers contributing code, but protect the shared architecture with early type definitions, small pull requests, daily integration, and clear ownership.

At the end of the week, describe the result as a **frontend prototype using mock data**, not a production-ready delivery platform. Real API integration, secure authentication, authorization, and payment processing belong to a later milestone.
