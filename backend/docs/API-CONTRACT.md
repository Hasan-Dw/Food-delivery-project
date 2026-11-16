# Savora API — contract

Base URL: `http://localhost:3000/api/v1`

Interactive OpenAPI document: `http://localhost:3000/api/docs`

All endpoints below are prefixes of the base URL. Authenticated endpoints expect
`Authorization: Bearer <accessToken>`.

The contract covers authentication, profiles, restaurants, menus, orders,
deliveries, driver assignment, checkout pricing, promotions, Cloudinary image
uploads, road routing/ETA and live tracking. Reviews, notifications, payment
gateway charges, admin approval dashboards and restaurant analytics are not
implemented.

## Response envelope

Successful responses are wrapped once:

```json
{
  "data": {},
  "meta": { "requestId": "c0ffee..." }
}
```

`meta` is present when the request carried an id (the middleware always sets
one). `204 No Content` responses have no body.

List data uses:

```json
{
  "data": {
    "items": [],
    "page": 1,
    "perPage": 12,
    "total": 0,
    "hasMore": false
  }
}
```

### Errors

```json
{
  "code": "validation_failed",
  "message": "Validation failed.",
  "details": { "email": ["email must be an email"] },
  "requestId": "c0ffee..."
}
```

| Code | Typical status | Meaning |
| --- | --- | --- |
| `bad_request` | 400 | Malformed request. |
| `validation_failed` | 400 | `class-validator` rejected one or more fields. See `details`. |
| `invalid_identifier` | 400 | The path id is not a valid Mongo ObjectId. |
| `invalid_role` | 400 | A role outside public registration was requested. |
| `invalid_reset_token` | 400 | Reset token is unknown or expired. |
| `unauthorized` | 401 | Missing, malformed or stale access token. |
| `invalid_credentials` | 401 | Email and password do not match. |
| `forbidden` | 403 | Authenticated but the role is not allowed. |
| `account_not_approved` | 403 | Pending/rejected/suspended account tried an operational route. |
| `account_rejected` | 403 | Rejected account tried to sign in. |
| `account_suspended` | 403 | Suspended account tried to sign in. |
| `not_found` | 404 | Resource does not exist or is not visible to the caller. |
| `conflict` | 409 | Duplicate email, slug or other unique value. |
| `internal_error` | 500 | Unexpected server failure. Details are logged, not returned. |

Phase 2 adds domain-specific codes. All use the same error envelope.

| Code | Typical status | Meaning |
| --- | --- | --- |
| `idempotency_conflict` | 409 | The key is already bound to a different cart or restaurant. |
| `duplicate_order` | 409 | A second order was submitted for the same idempotency key. |
| `order_not_found` | 404 | Order id is unknown or not visible to the caller. |
| `invalid_order_transition` | 409 | The requested order action is not valid from the current status. |
| `completion_owned_by_delivery` | 400 | Manual order completion is rejected; delivery completion owns it. |
| `delivery_in_progress` | 409 | The order has left the restaurant and cannot be cancelled. |
| `payment_method_not_found` | 400 | The supplied payment method is not on the caller's account. |
| `restaurant_unavailable` | 404 | Restaurant is missing, unapproved or not open. |
| `restaurant_closed` | 409 | Restaurant is approved but currently closed. |
| `cart_empty` | 400 | No cart lines were supplied. |
| `menu_item_unavailable` | 409 | A product is missing, belongs to another restaurant or is unavailable. |
| `menu_option_unavailable` | 409 | A selected option is missing from the product. |
| `menu_option_required` | 400 | A required option group has no selection. |
| `menu_option_limit` | 400 | A group selected more options than allowed. |
| `invalid_quantity` | 400 | Quantity is outside the accepted range. |
| `minimum_order_not_met` | 409 | The priced subtotal is below the restaurant minimum. |
| `promotion_invalid` | 409 | The code is unknown, inactive or not applicable. |
| `promotion_expired` | 409 | The promotion is past `expiresAt`. |
| `promotion_not_applicable` | 409 | The promotion is scoped to another restaurant. |
| `promotion_minimum_not_met` | 409 | The subtotal is below the promotion minimum. |
| `promotion_usage_limit` | 409 | The platform or per-customer usage limit was reached. |
| `promotion_customer_limit` | 409 | The caller has already used this promotion the allowed number of times. |
| `promotion_code_taken` | 409 | An admin tried to create a duplicate code. |
| `promotion_not_found` | 404 | Admin update/deactivate target does not exist. |
| `promotion_expiry_invalid` | 400 | Expiry is in the past or otherwise invalid. |
| `promotion_discount_invalid` | 400 | The discount configuration is inconsistent. |
| `promotion_usage_limit_below_usage` | 400 | A new usage limit is below the recorded usage count. |
| `delivery_not_found` | 404 | Delivery id is unknown or not visible. |
| `delivery_not_assignable` | 409 | The delivery is not awaiting assignment, or the driver is busy. |
| `delivery_not_unassignable` | 409 | Only an `ASSIGNED` delivery may be released. |
| `delivery_not_reassignable` | 409 | Only an `ASSIGNED` delivery may be reassigned. |
| `assignment_required` | 400 | Use the assignment endpoint instead of a transition. |
| `driver_required` | 409 | The delivery has no assigned driver for this action. |
| `driver_not_found` | 404 | Driver id is unknown. |
| `driver_not_approved` | 409 | Driver is not approved for assignment. |
| `assignment_managed_by_platform` | 409 | A driver tried to set `ON_DELIVERY` manually. |
| `invalid_availability_transition` | 409 | The requested availability change is not allowed from the current state. |
| `active_delivery_exists` | 409 | A driver tried to go offline while holding an active delivery. |
| `driver_unavailable` | 409 | Driver is offline, already on a delivery or became busy. |
| `driver_outside_service_area` | 409 | Driver's service area does not cover the restaurant city. |
| `driver_already_assigned` | 409 | The driver is already attached to this delivery. |
| `delivery_assignment_changed` | 409 | The assignment changed concurrently; refresh and retry. |
| `delivery_changed` | 409 | The delivery changed concurrently; refresh and retry. |
| `delivery_not_active` | 409 | The driver has no active delivery for this action. |
| `invalid_delivery_transition` | 409 | The requested delivery action is not valid from the current status. |
| `order_closed` | 409 | The order is rejected, cancelled or otherwise closed. |
| `order_not_ready` | 409 | Pickup/transit/delivery requires a `READY` order. |
| `order_already_completed` | 409 | Delivery completion was attempted for a completed order. |
| `order_not_assignable` | 409 | The order does not accept a delivery assignment. |

## Authentication

### `POST /auth/register` — public

Registers a customer, restaurant owner or driver. The role defaults to
`CUSTOMER`; `ADMIN` is rejected. Customers are `APPROVED`; owners and drivers are
`PENDING_APPROVAL`. Owners must include `restaurant`; drivers must include
`driver`.

```json
{
  "fullName": "Maya Chen",
  "email": "maya@example.com",
  "password": "Savora123!",
  "phone": "+1 (718) 555-0142",
  "role": "CUSTOMER"
}
```

Owner variant adds:

```json
{
  "role": "RESTAURANT_OWNER",
  "restaurant": {
    "name": "Saffron & Oak",
    "address": "148 Wythe Avenue, Brooklyn, NY 11249",
    "phone": "+1 (718) 555-0188",
    "description": "Modern Mediterranean, cooked over fire."
  }
}
```

Driver variant adds:

```json
{
  "role": "DRIVER",
  "driver": {
    "phone": "+1 (917) 555-0119",
    "serviceArea": "Brooklyn and Lower Manhattan",
    "vehicle": "scooter"
  }
}
```

`vehicle` is one of `bike`, `scooter`, `car`.

Returns `201`:

```json
{
  "data": {
    "accessToken": "<jwt>",
    "expiresAt": "2026-11-19T12:00:00.000Z",
    "user": { "...UserResponse" }
  }
}
```

### `POST /auth/login` — public

```json
{ "email": "maya@example.com", "password": "Savora123!" }
```

Returns `200` with the same session shape as registration. Rejected and
suspended accounts receive `403`.

### `GET /auth/session` — bearer

Reloads the user and returns a fresh session:

```json
{ "data": { "accessToken": "<jwt>", "expiresAt": "...", "user": { "...UserResponse" } } }
```

### `GET /auth/me` — bearer

Returns the current `UserResponse` directly in `data`.

### `POST /auth/logout` — public, `204`

Stateless no-op. Clients delete their token.

### `POST /auth/password-reset` — public

```json
{ "email": "maya@example.com" }
```

Always returns `200` with a generic message, whether or not the address exists:

```json
{
  "data": {
    "message": "If that email address is registered, a reset link is on its way."
  }
}
```

Outside production the reset token is written to the server log. No email is
sent in Phase 1.

### `POST /auth/password-reset/confirm` — public

```json
{ "token": "<token from the log>", "password": "NewPassword123" }
```

Returns `200` with a confirmation message. Invalid or expired tokens return
`400 invalid_reset_token`.

## User profile

All routes require a bearer token.

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `GET` | `/me` | — | `UserResponse` |
| `PATCH` | `/me` | `fullName?`, `email?`, `phone?`, `avatarKey?`, `preferences?` | `UserResponse` |
| `PATCH` | `/me/preferences` | `dietary?`, `emailReceipts?`, `orderUpdates?`, `marketing?` | `UserResponse` |
| `GET` | `/me/addresses` | — | `AddressResponse[]` |
| `POST` | `/me/addresses` | `AddressInput` | `AddressResponse` (201) |
| `PUT` | `/me/addresses/:id` | `AddressInput` | `AddressResponse` |
| `DELETE` | `/me/addresses/:id` | — | `204` |
| `PATCH` | `/me/addresses/:id/default` | — | `AddressResponse[]` |
| `GET` | `/me/payment-methods` | — | `PaymentMethodResponse[]` |
| `POST` | `/me/profile-image` | multipart `image` | `UserResponse` |
| `DELETE` | `/me/profile-image` | — | `UserResponse` |

`avatarKey` in `UserResponse` holds a bundled key or, after an upload, the
Cloudinary URL. Profile images may only be changed by their owner.

`dietary` accepts `vegetarian`, `vegan`, `gluten-free`, `halal`.

`AddressInput`:

```json
{
  "label": "Home",
  "line1": "214 Bedford Avenue",
  "line2": "Apt 3B",
  "city": "Brooklyn",
  "state": "NY",
  "postalCode": "11211",
  "country": "USA",
  "instructions": "Buzzer 3B",
  "isDefault": true,
  "coordinates": { "lat": 40.7178, "lng": -73.9573 }
}
```

`label` is `Home`, `Work` or `Other`. `isDefault: true` clears the previous
default. The first address becomes the default automatically.

`role`, `accountStatus`, `restaurantId` and `driverId` are not accepted. The
API rejects requests that include them with `400 validation_failed`; the e2e
suite asserts they cannot be changed.

`UserResponse`:

```json
{
  "id": "66f...",
  "fullName": "Maya Chen",
  "email": "maya@example.com",
  "phone": "+1 (718) 555-0142",
  "avatarKey": "optional",
  "memberSince": "2026-11-12T12:00:00.000Z",
  "role": "CUSTOMER",
  "accountStatus": "APPROVED",
  "restaurantId": "optional",
  "driverId": "optional",
  "preferences": {
    "dietary": ["vegetarian"],
    "emailReceipts": true,
    "orderUpdates": true,
    "marketing": false
  }
}
```

## Restaurants

Public routes:

| Method | Path | Query | Result |
| --- | --- | --- | --- |
| `GET` | `/restaurants` | `search?`, `category?`, `sort?`, `page?`, `perPage?` | paginated `RestaurantResponse` |
| `GET` | `/restaurants/featured` | `limit?` (default 8) | `RestaurantResponse[]` |
| `GET` | `/restaurants/:idOrSlug` | — | `RestaurantResponse` |
| `GET` | `/restaurant-categories` | — | `RestaurantCategoryResponse[]` |
| `GET` | `/restaurants/:id/menu-categories` | — | `MenuCategoryResponse[]` |

`sort` is `recommended` (default), `rating`, `delivery_time` or
`delivery_fee`. Only approved restaurants are discoverable. Pending, rejected
and suspended restaurants return `404` from the detail route and never appear in
lists.

Owner routes require `RESTAURANT_OWNER` and `APPROVED`:

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `GET` | `/restaurants/mine` | — | `RestaurantResponse[]` |
| `POST` | `/restaurants` | `CreateRestaurantInput` | `RestaurantResponse` (201) |
| `PATCH` | `/restaurants/:id` | partial `CreateRestaurantInput` | `RestaurantResponse` |
| `POST` | `/restaurants/:id/image` | multipart `image` | `RestaurantResponse` |
| `DELETE` | `/restaurants/:id/image` | — | `RestaurantResponse` |
| `POST` | `/restaurants/:id/logo` | multipart `image` | `RestaurantResponse` |
| `DELETE` | `/restaurants/:id/logo` | — | `RestaurantResponse` |

`CreateRestaurantInput`:

```json
{
  "name": "Saffron & Oak",
  "tagline": "Modern Mediterranean, cooked over fire.",
  "cuisines": ["Mediterranean", "Middle Eastern"],
  "categorySlugs": ["healthy", "sandwiches"],
  "imageKey": "restaurant-saffron-oak",
  "address": {
    "line1": "148 Wythe Avenue",
    "city": "Brooklyn",
    "state": "NY",
    "postalCode": "11249",
    "country": "USA",
    "latitude": 40.7186,
    "longitude": -73.9576
  },
  "openingHours": [{ "day": "Monday", "open": "11:00", "close": "22:00" }],
  "deliveryFee": 0,
  "minOrder": 12,
  "priceLevel": 3,
  "estimatedDeliveryMinutes": [25, 40],
  "isOpen": true,
  "description": "Optional description.",
  "offerLabel": "Optional offer"
}
```

`ownerId`, `status`, `featured`, `rating`, `reviewCount`, `distanceKm` and
`badges` are platform-owned and absent from the DTOs. A new restaurant starts as
`PENDING_APPROVAL`; it is not publicly visible until an admin approves it in a
later phase. The seed script inserts approved fixtures directly.

Owner updates return `404` if the restaurant is not owned by the caller, so the
API does not disclose another owner's records.

`RestaurantResponse`:

```json
{
  "id": "66f...",
  "slug": "saffron-oak",
  "name": "Saffron & Oak",
  "tagline": "Modern Mediterranean, cooked over fire.",
  "cuisines": ["Mediterranean", "Middle Eastern"],
  "categorySlugs": ["healthy", "sandwiches"],
  "imageKey": "restaurant-saffron-oak",
  "rating": 4.8,
  "reviewCount": 1284,
  "deliveryFee": 0,
  "estimatedDeliveryMinutes": [25, 40],
  "distanceKm": 1.2,
  "minOrder": 12,
  "priceLevel": 3,
  "isOpen": true,
  "badges": ["Top rated"],
  "address": { "id": "...", "label": "Other", "line1": "...", "city": "...", "state": "...", "postalCode": "...", "country": "...", "isDefault": false },
  "openingHours": [{ "day": "Monday", "open": "11:00", "close": "22:00" }],
  "featured": true,
  "offerLabel": "Free delivery"
}
```

`RestaurantCategoryResponse`:

```json
{ "id": "...", "name": "Burgers", "slug": "burgers", "imageKey": "category-burgers", "itemCount": 12, "description": "..." }
```

## Menu items

Public routes:

| Method | Path | Query | Result |
| --- | --- | --- | --- |
| `GET` | `/menu-items` | `search?`, `restaurantId?`, `categoryId?`, `popular?`, `page?`, `perPage?` | paginated `MenuItemResponse` |
| `GET` | `/menu-items/popular` | `limit?` (default 8) | `MenuItemResponse[]` |
| `GET` | `/menu-items/:id` | — | `MenuItemResponse` |
| `GET` | `/restaurants/:id/menu-items` | — | available `MenuItemResponse[]` |

Owner routes require `RESTAURANT_OWNER` and `APPROVED`:

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `POST` | `/menu-items` | `CreateMenuItemInput` | `MenuItemResponse` (201) |
| `PATCH` | `/menu-items/:id` | partial `CreateMenuItemInput` | `MenuItemResponse` |
| `PATCH` | `/menu-items/:id/availability` | `{ "available": false }` | `MenuItemResponse` |
| `POST` | `/menu-items/:id/image` | multipart `image` | `MenuItemResponse` |
| `DELETE` | `/menu-items/:id/image` | — | `MenuItemResponse` |
| `DELETE` | `/menu-items/:id` | — | `204` |

`CreateMenuItemInput`:

```json
{
  "restaurantId": "66f...",
  "categoryId": "66f...",
  "name": "Fire-roasted lamb",
  "description": "Slow-roasted shoulder, charred flatbread.",
  "price": 24.5,
  "imageKey": "dish-lamb",
  "calories": 720,
  "isPopular": true,
  "isVegetarian": false,
  "isSpicy": false,
  "available": true,
  "optionGroups": [
    {
      "name": "Choose a side",
      "required": true,
      "minSelections": 1,
      "maxSelections": 1,
      "options": [
        { "name": "Charred greens", "priceDelta": 0, "isDefault": true },
        { "name": "Flatbread", "priceDelta": 2 }
      ]
    }
  ]
}
```

`price` and `priceDelta` are decimal major units in the API; the database stores
integer cents. `categoryId` must belong to `restaurantId`. The service validates
that the target category and restaurant exist and that the caller owns the
restaurant. Updates may not change `restaurantId`.

`MenuItemResponse`:

```json
{
  "id": "66f...",
  "restaurantId": "66f...",
  "categoryId": "66f...",
  "name": "Fire-roasted lamb",
  "description": "...",
  "price": 24.5,
  "imageKey": "dish-lamb",
  "calories": 720,
  "rating": 4.7,
  "reviewCount": 84,
  "isPopular": true,
  "isVegetarian": false,
  "isSpicy": false,
  "available": true,
  "optionGroups": [
    {
      "id": "...",
      "name": "Choose a side",
      "required": true,
      "minSelections": 1,
      "maxSelections": 1,
      "options": [
        { "id": "...", "name": "Charred greens", "priceDelta": 0, "isDefault": true }
      ]
    }
  ]
}
```

## Orders

All order routes require a bearer token. The service derives the customer,
restaurant and driver from the token; client-supplied ownership fields are never
trusted.

| Method | Path | Role | Result |
| --- | --- | --- | --- |
| `POST` | `/orders` | `CUSTOMER` | `OrderResponse` (201) |
| `GET` | `/orders` | any approved role | `OrderResponse[]` scoped to the caller |
| `GET` | `/orders/active` | any approved role | `OrderResponse \| null` |
| `GET` | `/orders/:id` | any approved role | `OrderResponse` |
| `GET` | `/orders/:id/history` | any approved role | tracking timeline |
| `POST` | `/orders/:id/transition` | customer, owner, admin | `OrderResponse` |

`GET /orders` accepts `restaurantId?` and `status?`. A customer sees only their
own orders, an owner only their restaurant's orders, a driver only orders with a
delivery assigned to them, and an admin sees all.

`POST /orders` body:

```json
{
  "idempotencyKey": "checkout-8f14e45f",
  "restaurantId": "66f...",
  "items": [
    {
      "productId": "66f...",
      "quantity": 2,
      "selectedOptions": [{ "groupId": "66f...", "optionId": "66f..." }],
      "notes": "No onions"
    }
  ],
  "deliveryAddress": {
    "label": "Home",
    "line1": "214 Bedford Avenue",
    "line2": "Apt 3B",
    "city": "Brooklyn",
    "state": "NY",
    "postalCode": "11211",
    "country": "USA",
    "instructions": "Buzzer 3B",
    "lat": 40.7178,
    "lng": -73.9573
  },
  "paymentMethodId": "66f...",
  "customerName": "Maya Chen",
  "customerPhone": "+1 (718) 555-0142",
  "couponCode": "WELCOME20",
  "notes": "Leave at the door"
}
```

Creation is server-authoritative and idempotent:

- `idempotencyKey` is unique. Repeating the same request returns the existing
  order instead of creating a second one. Reusing the key with a different cart
  or restaurant returns `409 idempotency_conflict`.
- The menu, option deltas, restaurant fee, minimum order and promotion are
  revalidated. Client prices and totals are not accepted.
- Item name, image key, unit price and selected option names/deltas are copied
  into the order, so later menu edits do not rewrite history.
- `paymentMethodId` must match a saved method on the caller's account. When the
  account has no saved methods, the literal `cash-on-delivery` is accepted and
  stored as a cash intent. No gateway charge occurs.
- A delivery is created immediately in `PENDING_ASSIGNMENT`; `deliveryId` is
  returned on the order. Promotion redemption is recorded atomically.

`OrderResponse`:

```json
{
  "id": "66f...",
  "code": "SV-10231",
  "customerId": "66f...",
  "customerName": "Maya Chen",
  "customerPhone": "+1 (718) 555-0142",
  "restaurantId": "66f...",
  "restaurantName": "Saffron & Oak",
  "restaurantImageKey": "restaurant-saffron-oak",
  "items": [
    {
      "id": "66f...",
      "productId": "66f...",
      "name": "Fire-roasted lamb",
      "imageKey": "dish-lamb",
      "quantity": 2,
      "unitPrice": 26.5,
      "selectedOptions": [
        {
          "groupId": "66f...",
          "groupName": "Choose a side",
          "optionId": "66f...",
          "optionName": "Flatbread",
          "priceDelta": 2
        }
      ]
    }
  ],
  "status": "PENDING",
  "placedAt": "2026-11-12T12:00:00.000Z",
  "deliveryAddress": { "...": "snapshot, same shape as the profile address" },
  "deliveryId": "66f...",
  "totals": {
    "subtotal": 53,
    "deliveryFee": 0,
    "serviceFee": 2.5,
    "discount": 10.6,
    "tax": 0,
    "total": 44.9
  },
  "paymentMethod": { "id": "...", "type": "card", "label": "Visa ending 4242", "last4": "4242", "isDefault": true },
  "couponCode": "WELCOME20",
  "notes": "Leave at the door"
}
```

Status stamps (`acceptedAt`, `preparingAt`, `readyAt`, `completedAt`,
`rejectedAt`, `cancelledAt`) are present once reached.

### Order lifecycle

| Action | Allowed from | Target | Who |
| --- | --- | --- | --- |
| `ACCEPT` | `PENDING` | `ACCEPTED` | owning owner, admin |
| `REJECT` | `PENDING` | `REJECTED` | owning owner, admin |
| `PREPARE` | `ACCEPTED` | `PREPARING` | owning owner, admin |
| `READY` | `PREPARING` | `READY` | owning owner, admin |
| `CANCEL` | `PENDING`, `ACCEPTED`, `PREPARING`, `READY` | `CANCELLED` | customer (own order), admin |
| `COMPLETE` | — | — | rejected with `400 completion_owned_by_delivery` |

- A customer cancellation is rejected with `409 delivery_in_progress` once the
  delivery is `PICKED_UP`, `ON_THE_WAY` or `DELIVERED`.
- `READY` triggers automatic driver assignment. Failure to find a driver does not
  fail the order; the delivery stays `PENDING_ASSIGNMENT`.
- `CANCELLED` and `REJECTED` cancel the delivery and release any promotion
  redemption. The order status is never moved backwards.

`GET /orders/:id/history` returns the timeline used by tracking lives:

```json
{
  "data": [
    {
      "kind": "order",
      "status": "PREPARING",
      "label": "Preparing",
      "description": "The kitchen is preparing your order.",
      "timestamp": "2026-11-12T12:04:00.000Z",
      "completed": true
    }
  ]
}
```

## Deliveries

All routes require a bearer token.

| Method | Path | Role | Result |
| --- | --- | --- | --- |
| `POST` | `/deliveries` | customer, admin | `DeliveryResponse` (201) |
| `GET` | `/deliveries` | any approved role | scoped `DeliveryResponse[]` |
| `GET` | `/deliveries/active?driverId?` | driver, admin | `DeliveryResponse \| null` |
| `GET` | `/deliveries/by-order/:orderId` | any approved role | `DeliveryResponse` |
| `GET` | `/deliveries/:id` | any approved role | `DeliveryResponse` |
| `POST` | `/deliveries/:id/assign` | admin | `DeliveryResponse` |
| `POST` | `/deliveries/:id/auto-assign` | admin | `AutoAssignmentResult` |
| `POST` | `/deliveries/:id/unassign` | admin | `DeliveryResponse` |
| `POST` | `/deliveries/:id/reassign` | admin | `DeliveryResponse` |
| `POST` | `/deliveries/:id/transition` | driver, admin | `DeliveryResponse` |
| `PUT` | `/deliveries/:id/location` | driver, admin | `DeliveryResponse` |

`POST /deliveries` is idempotent per order: the backend already creates the
delivery with the order, so this returns the existing delivery instead of
duplicating it. Body is `{ "orderId": "66f...", "idempotencyKey"? }`.

`DeliveryResponse`:

```json
{
  "id": "66f...",
  "orderId": "66f...",
  "driverId": "66f...",
  "restaurantId": "66f...",
  "customerId": "66f...",
  "status": "ASSIGNED",
  "estimatedArrivalAt": "2026-11-12T12:35:00.000Z",
  "assignedAt": "2026-11-12T12:08:00.000Z",
  "driverLocation": {
    "driverId": "66f...",
    "deliveryId": "66f...",
    "lat": 40.7186,
    "lng": -73.9576,
    "updatedAt": "2026-11-12T12:08:00.000Z"
  },
  "assignmentHistory": [
    {
      "id": "66f...",
      "deliveryId": "66f...",
      "previousDriverId": null,
      "newDriverId": "66f...",
      "driverId": "66f...",
      "driverName": "Sam Rivera",
      "action": "ASSIGNED",
      "source": "AUTOMATIC",
      "adminId": null,
      "at": "2026-11-12T12:08:00.000Z"
    }
  ],
  "autoAssignment": {
    "attempts": 1,
    "lastTrigger": "ORDER_READY",
    "status": "ASSIGNED",
    "lastAttemptAt": "2026-11-12T12:08:00.000Z"
  },
  "createdAt": "2026-11-12T12:00:00.000Z",
  "updatedAt": "2026-11-12T12:08:00.000Z"
}
```

### Delivery lifecycle

| Action | Allowed from | Target | Who |
| --- | --- | --- | --- |
| assignment | `PENDING_ASSIGNMENT` | `ASSIGNED` | admin or automatic assignment |
| `PICK_UP` | `ASSIGNED` | `PICKED_UP` | assigned driver, admin |
| `START_TRANSIT` | `PICKED_UP` | `ON_THE_WAY` | assigned driver, admin |
| `DELIVER` | `ON_THE_WAY` | `DELIVERED` | assigned driver, admin |
| `CANCEL` | pre-terminal | `CANCELLED` | admin (assignment release uses unassign) |

`DELIVER` atomically marks the delivery delivered, the order `COMPLETED`, and
returns the driver to `AVAILABLE`. The `ASSIGN` transition is rejected; use the
assignment endpoints.

Assignment rules:

- Only an `APPROVED` driver whose availability is `AVAILABLE` and whose
  `activeDeliveryId` is empty may be assigned. This prevents concurrent double
  assignment.
- The driver's service area must cover the restaurant city. `All boroughs` and
  missing values are treated as compatible.
- `unassign` releases only an `ASSIGNED` delivery back to `PENDING_ASSIGNMENT`
  and leaves the order `READY`. `CANCELLED` never returns to
  `PENDING_ASSIGNMENT`.
- `reassign` also requires `ASSIGNED` and verifies the replacement driver is free.
- `auto-assign` returns `{ assigned, deliveryId, driverId?, status, reason? }`;
  `status` is one of `ASSIGNED`, `NO_ELIGIBLE_DRIVER`, `SKIPPED`, `COOLDOWN`,
  `EXHAUSTED`.

`PUT /deliveries/:id/location` accepts `{ lat, lng, heading?, speedKph? }`. It is
a snapshot write, not a socket feed; real-time GPS is Phase 3.

## Drivers

| Method | Path | Role | Result |
| --- | --- | --- | --- |
| `GET` | `/drivers` | admin | `DriverResponse[]` (`accountStatus?`, `availability?`) |
| `GET` | `/drivers/by-user/:userId` | driver (self), admin | `DriverResponse` |
| `GET` | `/drivers/:id` | driver (self), admin | `DriverResponse` |
| `PATCH` | `/drivers/:id/availability` | driver (self), admin | `DriverResponse` |
| `GET` | `/drivers/:id/location` | driver (self), admin | `DriverLocationResponse \| null` |
| `PUT` | `/drivers/:id/location` | driver (self), admin | `DriverLocationResponse` |

`PATCH .../availability` body: `{ "availability": "AVAILABLE" }`, one of
`OFFLINE`, `AVAILABLE`, `ON_DELIVERY`. A driver cannot set `ON_DELIVERY` manually
while idle; assignment and completion own that transition.

`DriverResponse`:

```json
{
  "id": "66f...",
  "userId": "66f...",
  "name": "Sam Rivera",
  "avatarKey": "avatar-driver",
  "vehicle": "scooter",
  "rating": 4.9,
  "completedDeliveries": 214,
  "totalEarnings": 3180.5,
  "phone": "+1 (917) 555-0119",
  "serviceArea": "All boroughs",
  "accountStatus": "APPROVED",
  "availability": "AVAILABLE",
  "activeDeliveryId": null,
  "createdAt": "2026-11-01T09:00:00.000Z"
}
```

`DriverLocationResponse` is `{ driverId, deliveryId?, lat, lng, heading?, speedKph?, updatedAt }`.

## Checkout

### `POST /checkout/quote` — customer

Server-authoritative pricing for the cart before submission. The browser cart is
a draft only.

```json
{
  "restaurantId": "66f...",
  "items": [
    {
      "productId": "66f...",
      "quantity": 2,
      "selectedOptions": [{ "groupId": "66f...", "optionId": "66f..." }],
      "notes": "No onions"
    }
  ],
  "couponCode": "WELCOME20"
}
```

Returns:

```json
{
  "restaurantId": "66f...",
  "restaurantName": "Saffron & Oak",
  "restaurantImageKey": "restaurant-saffron-oak",
  "items": [
    {
      "productId": "66f...",
      "name": "Fire-roasted lamb",
      "imageKey": "dish-lamb",
      "quantity": 2,
      "unitPrice": 26.5,
      "selectedOptions": [
        {
          "groupId": "66f...",
          "groupName": "Choose a side",
          "optionId": "66f...",
          "optionName": "Flatbread",
          "priceDelta": 2
        }
      ],
      "notes": "No onions"
    }
  ],
  "subtotal": 53,
  "deliveryFee": 0,
  "serviceFee": 2.5,
  "discount": 10.6,
  "tax": 0,
  "total": 44.9,
  "minOrder": 12,
  "currency": "USD",
  "couponCode": "WELCOME20",
  "promotion": {
    "valid": true,
    "code": "WELCOME20",
    "title": "20% off your first order",
    "discount": 10.6
  }
}
```

An unusable code does not fail the quote. `promotion.valid` is `false` with a
`message`, and the totals exclude the discount. Order creation revalidates and
fails hard on an invalid code. Service fee is `250` cents; tax is `0`.

## Promotions

| Method | Path | Role | Result |
| --- | --- | --- | --- |
| `GET` | `/promotions?restaurantId?` | public | active, unexpired `PromotionResponse[]` |
| `GET` | `/promotions/admin` | admin | all `PromotionResponse[]` |
| `POST` | `/promotions` | admin | `PromotionResponse` (201) |
| `POST` | `/promotions/validate` | customer | `PromotionPreview` |
| `PATCH` | `/promotions/:id` | admin | `PromotionResponse` |
| `DELETE` | `/promotions/:id` | admin | deactivated `PromotionResponse` |

`POST /promotions/validate` body:
`{ "code": "WELCOME20", "restaurantId"?: "66f...", "subtotal"?: 53 }`. The
subtotal is display-only and never used for an order. Returns
`{ valid, code, title?, description?, discount, message? }`.

`PromotionResponse`:

```json
{
  "id": "66f...",
  "title": "20% off your first order",
  "subtitle": "Welcome to Savora",
  "description": "Applies to your first order over $15.",
  "code": "WELCOME20",
  "imageKey": "offer-welcome",
  "expiresAt": "2027-01-31T23:59:59.000Z",
  "accent": "terracotta",
  "minOrder": 15,
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "usageLimit": 500,
  "usageCount": 42,
  "perCustomerLimit": 1,
  "active": true
}
```

Admin create/update body:

```json
{
  "code": "WELCOME20",
  "title": "20% off your first order",
  "subtitle": "Welcome to Savora",
  "description": "Applies to your first order over $15.",
  "imageKey": "offer-welcome",
  "accent": "terracotta",
  "discountType": "PERCENTAGE",
  "value": 20,
  "minOrder": 15,
  "expiresAt": "2027-01-31T23:59:59.000Z",
  "usageLimit": 500,
  "perCustomerLimit": 1,
  "active": true
}
```

`discountType` is `PERCENTAGE` (`value` 0.01–100) or `FIXED` (`value` decimal
currency). `usageLimit: 0` means unlimited. `restaurantId` scopes the promotion
to one restaurant; omit it for platform-wide. `DELETE` deactivates rather than
deletes so redemption history stays intact.

The seed creates `WELCOME20` (20% off, $15 minimum, once per customer),
`FREESHIP5` ($5 off, $20 minimum) and `SWEET10` (10% off desserts), all expiring
in 2027.

## Images

All image routes accept a single `multipart/form-data` field named `image`.
Allowed content is JPEG, PNG or WebP, determined from the file signature (not
the declared MIME type), up to 5 MB. Files are stored in Cloudinary; MongoDB
keeps only the URL (`imageKey`, `logoKey`, `avatarKey`) and the public id.

| Method | Path | Who | Result |
| --- | --- | --- | --- |
| `POST` | `/restaurants/:id/image` | owning owner or admin | `RestaurantResponse` |
| `DELETE` | `/restaurants/:id/image` | owning owner or admin | `RestaurantResponse` (restores default artwork) |
| `POST` | `/restaurants/:id/logo` | owning owner or admin | `RestaurantResponse` |
| `DELETE` | `/restaurants/:id/logo` | owning owner or admin | `RestaurantResponse` |
| `POST` | `/menu-items/:id/image` | owning owner or admin | `MenuItemResponse` |
| `DELETE` | `/menu-items/:id/image` | owning owner or admin | `MenuItemResponse` |
| `POST` | `/me/profile-image` | the signed-in user | `UserResponse` |
| `DELETE` | `/me/profile-image` | the signed-in user | `UserResponse` |

Image replacement stores the new asset first, updates MongoDB, and only then
deletes the previous asset. If the database write fails, the new asset is
discarded so no stale reference is left behind.

Errors:

- `400 invalid_upload` — no file or a file whose signature is not a supported image.
- `413 image_too_large` — the file exceeds 5 MB.
- `503 image_service_unconfigured` — `CLOUDINARY_*` credentials are not set.

## Tracking

### `GET /orders/:orderId/tracking` — scoped

Returns a read-only snapshot. Visibility: the ordering customer, the assigned
driver, the owning restaurant, or an admin. Anyone else receives `403`.

```json
{
  "orderId": "66f...",
  "deliveryId": "66f...",
  "orderStatus": "READY",
  "deliveryStatus": "ASSIGNED",
  "driver": { "...DriverResponse" },
  "driverLocation": {
    "driverId": "66f...",
    "deliveryId": "66f...",
    "lat": 40.7186,
    "lng": -73.9576,
    "updatedAt": "2026-11-12T12:08:00.000Z"
  },
  "etaMinutes": 27,
  "estimatedArrivalAt": "2026-11-12T12:35:00.000Z",
  "destination": { "label": "Home", "address": "214 Bedford Avenue, Brooklyn, NY", "coordinates": { "lat": 40.7178, "lng": -73.9573 } },
  "restaurant": { "label": "Saffron & Oak", "address": "148 Wythe Avenue, Brooklyn, NY", "coordinates": { "lat": 40.7186, "lng": -73.9576 } },
  "route": { "points": [{ "lat": 40.7186, "lng": -73.9576 }, { "lat": 40.7178, "lng": -73.9573 }], "distanceKm": 1.4, "source": "osrm" },
  "remainingDistanceKm": 1.4,
  "etaSource": "osrm",
  "progress": 0.15,
  "lastUpdated": "2026-11-12T12:08:00.000Z",
  "live": true
}
```

`etaMinutes` is `null` while no coordinates are available (the UI shows
"Estimating…"). `remainingDistanceKm` is real road distance when the routing
provider is reachable. `source`/`etaSource` are `osrm` (real road route),
`straight-line` (labelled fallback) or `none`. Delivered and cancelled
deliveries return `0` distance/ETA and no driver position.

### Socket.IO `/tracking`

Clients connect with the access token in the handshake:

```js
const socket = io(`${apiOrigin}/tracking`, { auth: { token: accessToken } });
socket.emit('tracking:subscribe', { orderId });
socket.on('tracking:snapshot', (snapshot) => { /* TrackingSnapshotResponse */ });
socket.on('tracking:error', ({ code, message }) => { /* handle */ });
socket.emit('tracking:unsubscribe', { orderId });
```

- The server validates the token through `JwtStrategy` on connect and rejects
  disallowed origins or invalid tokens.
- `tracking:subscribe` reuses `GET /orders/:orderId/tracking` authorization, so
  only the customer, assigned driver, owning restaurant or an admin joins
  `order:{id}`.
- The server emits a snapshot immediately after subscribing and again after every
  assignment, lifecycle change, GPS update or cancellation.
- When `LIVE_TRACKING_ENABLED=false`, the namespace is not registered and
  snapshots return `live: false` for HTTP polling.

## Status codes used

| Status | Used by |
| --- | --- |
| `200` | Reads, login, session, password reset, patches, order/delivery transitions, checkout quote, promotion validation |
| `201` | Registration, address, restaurant, menu item, order, delivery, promotion |
| `204` | Logout, delete address, delete menu item |
| `400` | Validation, invalid ids and roles, bad reset token, manual order completion, pricing/option rules |
| `401` | Missing/invalid token, bad credentials |
| `403` | Wrong role, unapproved account, blocked sign-in, non-owner/non-driver/non-customer access |
| `404` | Missing or non-public resource, non-owned resource, unknown order/delivery/driver/promotion |
| `409` | Duplicate unique value, idempotency conflict, invalid lifecycle transition, unavailable menu item, promotion rule failure, driver unavailability |
| `413` | Upload exceeds the 5 MB image limit |
| `503` | Image storage is not configured (`image_service_unconfigured`) |
| `500` | Unexpected server error |
