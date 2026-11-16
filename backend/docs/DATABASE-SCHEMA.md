# Savora API — database schema

Database: MongoDB, accessed through Mongoose 8. The connection string comes from
`MONGODB_URI`; no credentials are committed.

Collections in Phases 1 and 2:

| Collection | Purpose |
| --- | --- |
| `users` | Accounts, profile, preferences, addresses, payment methods, reset state |
| `driver_profiles` | Platform-owned driver records, availability, stats and active delivery |
| `restaurants` | Restaurant records owned by a `RESTAURANT_OWNER` |
| `restaurant_categories` | Platform cuisine catalogue used by discovery |
| `menu_categories` | Menu sections belonging to one restaurant |
| `menu_items` | Dishes and their option groups |
| `orders` | Purchased orders, price snapshots, status timeline |
| `deliveries` | One transportation record per order, assignment audit and location |
| `promotions` | Platform and restaurant promotion configuration |
| `promotion_redemptions` | Immutable per-order promotion usage |

## `users`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Serialized as `id`. |
| `email` | string | Required, unique, lowercased, trimmed. |
| `passwordHash` | string | bcrypt hash, `select: false`. |
| `fullName` | string | Required, max 120. |
| `phone` | string | Optional, default `""`. |
| `avatarKey` | string | Optional media key or, after an upload, the Cloudinary URL. |
| `avatarPublicId` | string | Cloudinary public id used to replace/delete the asset. |
| `role` | enum | `CUSTOMER`, `RESTAURANT_OWNER`, `DRIVER`, `ADMIN`. |
| `accountStatus` | enum | `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`. |
| `restaurantId` | ObjectId → `restaurants` | Set for an owner's primary restaurant. |
| `driverId` | ObjectId → `driver_profiles` | Set for a driver account. |
| `preferences` | embedded | `dietary[]`, `emailReceipts`, `orderUpdates`, `marketing`. |
| `addresses` | embedded array | See below. |
| `paymentMethods` | embedded array | Read-only in Phase 1. |
| `passwordResetTokenHash` | string | SHA-256 of the reset token, `select: false`. |
| `passwordResetExpiresAt` | Date | One-hour expiry, `select: false`. |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps. |

Indexes:

- unique `email`
- `role`
- `accountStatus`
- compound `{ role, accountStatus }`

### Embedded `addresses`

Each address has its own `_id` so it can be addressed by id:

`label` (`Home` | `Work` | `Other`), `line1`, `line2?`, `city`, `state`,
`postalCode`, `country`, `instructions?`, `isDefault`, and optional
`coordinates: { lat, lng }`.

The service guarantees exactly one default when addresses exist; deleting the
default promotes another address.

### Embedded `paymentMethods`

`type` (`card`, `cash`, `wallet`), `label`, `brand?` (`visa`, `mastercard`,
`amex`), `last4?`, `expiry?`, `isDefault`. No full card number, CVV or token is
stored. Phase 1 only reads these.

## `driver_profiles`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Serialized as `driverId`. |
| `userId` | ObjectId → `users` | Required, unique. |
| `vehicle` | enum | `bike`, `scooter`, `car`. |
| `serviceArea` | string | Human label, e.g. "All boroughs". |
| `phone` | string | Registration phone, max 40. |
| `accountStatus` | enum | Mirrors the approval lifecycle. |
| `availability` | enum | `OFFLINE`, `AVAILABLE`, `ON_DELIVERY`. |
| `activeDeliveryId` | ObjectId → `deliveries` | At most one; non-null only while assigned. |
| `rating` | number | 0–5, platform-owned, default 5. |
| `completedDeliveries` | number | Incremented on delivery completion. |
| `totalEarningsCents` | integer | Stored in cents; exposed as decimal. |
| `lastLocation` | embedded | `lat`, `lng`, `heading?`, `speedKph?`, `updatedAt`. |
| `approvedAt` | Date | Set when the account is approved. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Indexes: unique `userId`; `accountStatus`; compound
`{ accountStatus, availability }`.

Drivers are platform-owned. There is deliberately no `restaurantId` field.
Assignment, delivery lifecycle and GPS snapshots live in `deliveries`.

## `restaurants`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Serialized as `id`. |
| `ownerId` | ObjectId → `users` | Required; set from the token. |
| `name` | string | Required, max 120. |
| `slug` | string | Unique, generated from the name. |
| `tagline` | string | Max 160. |
| `cuisines` | string[] | Display labels. |
| `categorySlugs` | string[] | References `restaurant_categories.slug`. |
| `imageKey` | string | Media key or, after an upload, the Cloudinary cover URL. |
| `imagePublicId` | string | Cloudinary public id for the cover asset. |
| `logoKey` | string | Optional Cloudinary logo URL; falls back to bundled artwork. |
| `logoPublicId` | string | Cloudinary public id for the logo asset. |
| `rating` | number | 0–5, platform-owned. |
| `reviewCount` | number | Platform-owned. |
| `deliveryFee` | number | Decimal major units. |
| `estimatedDeliveryMinutes` | `[number, number]` | Validated integer pair. |
| `distanceKm` | number | Platform-owned. |
| `minOrder` | number | Decimal major units. |
| `priceLevel` | number | 1–4. |
| `isOpen` | boolean | Owner-controlled availability. |
| `badges` | string[] | Platform-owned. |
| `address` | embedded | `line1`, `line2?`, `city`, `state`, `postalCode`, `country`, `instructions?`, `label`, `isDefault`, `coordinates?`. |
| `openingHours` | embedded array | `day`, `open`, `close`. |
| `featured` | boolean | Platform-owned. |
| `offerLabel` | string | Optional. |
| `description` | string | Optional, max 1000. |
| `status` | enum | Same lifecycle as accounts; default `PENDING_APPROVAL`. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Indexes:

- unique `slug`
- `ownerId`
- `status`
- compound `{ status, featured, rating }`
- compound `{ categorySlugs, status }`

Approval rules:

- The owner DTO cannot set `ownerId`, `slug`, `status`, `featured`, `rating`,
  `reviewCount`, `distanceKm` or `badges`.
- New restaurants start `PENDING_APPROVAL`.
- Public list/detail only expose `APPROVED` restaurants.
- The seed script inserts approved fixtures.

## `restaurant_categories`

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required, max 60. |
| `slug` | string | Required, unique. |
| `imageKey` | string | Required. |
| `description` | string | Optional. |
| `sortOrder` | number | Discovery ordering, default 0. |

`itemCount` in the API response is computed from approved restaurants that
reference the category; it is not stored.

## `menu_categories`

| Field | Type | Notes |
| --- | --- | --- |
| `restaurantId` | ObjectId → `restaurants` | Required. |
| `name` | string | Required, max 60. |
| `description` | string | Optional. |
| `sortOrder` | number | Default 0. |

Indexes:

- `{ restaurantId, sortOrder }`
- unique `{ restaurantId, name }`

The restaurant service creates default sections when an owner creates a
restaurant without explicit categories.

## `menu_items`

| Field | Type | Notes |
| --- | --- | --- |
| `restaurantId` | ObjectId → `restaurants` | Required; immutable after creation. |
| `categoryId` | ObjectId → `menu_categories` | Required; must belong to the same restaurant. |
| `name` | string | Required, max 120. |
| `description` | string | Required in the DTO, max 500. |
| `priceCents` | integer | Stored in cents; API exposes `price` in major units. |
| `imageKey` | string | Media key or, after an upload, the Cloudinary image URL. |
| `imagePublicId` | string | Cloudinary public id for the dish image. |
| `calories` | number | Optional, 0–5000. |
| `rating` | number | 0–5, platform-owned. |
| `reviewCount` | number | Platform-owned. |
| `isPopular` | boolean | Drives the popular rail. |
| `isVegetarian` | boolean | Dietary label. |
| `isSpicy` | boolean | Dietary label. |
| `available` | boolean | Owner-controlled. |
| `optionGroups` | embedded array | See below. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Indexes:

- `restaurantId`
- `categoryId`
- compound `{ restaurantId, categoryId, name }`
- compound `{ isPopular, available }`

### Embedded `optionGroups`

```
{
  name: string,
  required: boolean,
  minSelections: number,
  maxSelections: number,
  options: [
    {
      name: string,
      priceDeltaCents: number,
      isDefault: boolean
    }
  ]
}
```

`priceDeltaCents` is stored in cents and exposed as decimal `priceDelta`. Each
option and group has its own `_id`, serialized as `id`.

## `orders`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Serialized as `id`. |
| `idempotencyKey` | string | Required, unique; one order per checkout session. |
| `code` | string | Required, unique; customer-facing order code. |
| `customerId` | ObjectId → `users` | Always the authenticated customer. |
| `customerName` | string | Required, max 120. |
| `customerPhone` | string | Optional, max 40. |
| `restaurantId` | ObjectId → `restaurants` | Required. |
| `restaurantName` | string | Snapshot at purchase time. |
| `restaurantImageKey` | string | Snapshot at purchase time. |
| `items` | embedded array | Purchased line items. |
| `status` | enum | `PENDING`, `ACCEPTED`, `REJECTED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`. |
| `deliveryAddress` | embedded | Snapshot of the destination. |
| `deliveryId` | ObjectId → `deliveries` | Set when the delivery is created. |
| `totals` | embedded | All values in integer cents. |
| `paymentMethod` | embedded | Snapshot; type, label, brand?, last4?, expiry?, isDefault. |
| `paymentStatus` | enum | `PENDING`, `PAID`, `FAILED`, `REFUNDED`. No gateway integration yet. |
| `promotionId` | ObjectId → `promotions` | Set when a code is redeemed. |
| `couponCode` | string | Normalized uppercase code snapshot. |
| `notes` | string | Optional, max 1000. |
| `placedAt` | Date | When the order was submitted. |
| `acceptedAt`, `preparingAt`, `readyAt`, `completedAt`, `rejectedAt`, `cancelledAt` | Date | Set as status is reached. |
| `statusHistory` | embedded array | `status`, `at`, `byUserId?`, `reason?`. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Indexes:

- unique `idempotencyKey`
- unique `code`
- `customerId`
- `restaurantId`
- `status`
- compound `{ customerId, placedAt: -1 }`
- compound `{ restaurantId, placedAt: -1 }`
- compound `{ restaurantId, status }`

### Embedded order `items`

Each line has its own `_id`. `productId` references the menu item, while
`name`, `imageKey`, `unitPriceCents` and `selectedOptions[]` are immutable
snapshots. An option stores `groupId`, `groupName`, `optionId`, `optionName`,
`priceDeltaCents`.

### Embedded `totals`

`subtotalCents`, `deliveryFeeCents`, `serviceFeeCents`, `discountCents`,
`taxCents`, `totalCents`. All are integer cents and non-negative.

### Embedded `deliveryAddress`

`label`, `line1`, `line2?`, `city`, `state`, `postalCode`, `country`,
`instructions?`, `isDefault`, `coordinates?`. This is a snapshot; editing the
profile address later does not change an existing order.

## `deliveries`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Serialized as `id`. |
| `orderId` | ObjectId → `orders` | Required, unique; one delivery per order. |
| `driverId` | ObjectId → `driver_profiles` | Null while unassigned or after release. |
| `restaurantId` | ObjectId → `restaurants` | Required. |
| `customerId` | ObjectId → `users` | Required. |
| `status` | enum | `PENDING_ASSIGNMENT`, `ASSIGNED`, `PICKED_UP`, `ON_THE_WAY`, `DELIVERED`, `CANCELLED`. |
| `estimatedArrivalAt` | Date | Set on assignment. |
| `assignedAt`, `pickedUpAt`, `deliveredAt`, `cancelledAt` | Date | Lifecycle stamps. |
| `driverLocation` | embedded | `lat`, `lng`, `heading?`, `speedKph?`, `updatedAt`; latest point only. |
| `assignmentHistory` | embedded array | Append-only audit rows. |
| `autoAssignment` | embedded | `attempts`, `lastAttemptAt?`, `lastTrigger?`, `status`, `reason?`. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Indexes:

- unique `orderId`
- `driverId`
- `restaurantId`
- `customerId`
- `status`
- compound `{ driverId, status }`
- compound `{ status, createdAt }`

### Embedded `assignmentHistory`

Each row has its own `_id` and records `action` (`ASSIGNED`, `UNASSIGNED`,
`REASSIGNED`), `source` (`AUTOMATIC`, `MANUAL`), `previousDriverId`,
`newDriverId`, `driverId`, `driverName`, `adminId?`, `reason?` and `at`. Rows are
never mutated or removed.

## `promotions`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Serialized as `id`. |
| `code` | string | Unique, uppercased, trimmed. |
| `title` | string | Required, max 120. |
| `subtitle`, `description` | string | Optional copy. |
| `imageKey` | string | Media key, default `offer-default`. |
| `accent` | enum | `terracotta`, `olive`, `gold`. |
| `discountType` | enum | `PERCENTAGE`, `FIXED`. |
| `percentOff` | number | 1–100 for percentage promotions. |
| `amountOffCents` | integer | Fixed discount in cents. |
| `minOrderCents` | integer | Minimum subtotal in cents. |
| `expiresAt` | Date | Required. |
| `restaurantId` | ObjectId → `restaurants` \| null | Null means platform-wide. |
| `usageLimit` | integer | 0 means unlimited. |
| `usageCount` | integer | Incremented on redemption, decremented on release. |
| `perCustomerLimit` | integer | Minimum 1. |
| `active` | boolean | Admin deactivation sets this false. |
| `createdBy` | ObjectId → `users` | Admin who created it. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Indexes: unique `code`; `restaurantId`; `active`; compound
`{ active, expiresAt }`.

## `promotion_redemptions`

| Field | Type | Notes |
| --- | --- | --- |
| `promotionId` | ObjectId → `promotions` | Required. |
| `customerId` | ObjectId → `users` | Required. |
| `orderId` | ObjectId → `orders` | Required, unique; one redemption per order. |
| `code` | string | Uppercase snapshot. |
| `discountCents` | integer | Applied discount. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Indexes: unique `orderId`; `promotionId`; `customerId`; compound
`{ promotionId, customerId }`.

## Money and identifiers

- Mongo ObjectIds never leak as `_id`; mappers expose `id` strings.
- Monetary values are split by layer:
  - menu item and option prices: integer cents in MongoDB, decimal major units
    in the API;
  - restaurant `deliveryFee` and `minOrder`: decimal major units in both;
  - order totals, order unit prices, promotion fixed amounts and driver earnings:
    integer cents in MongoDB, decimal major units in responses.
- `passwordHash`, reset-token fields, `__v` and internal timestamps that are not
  in a response interface are never serialized.

## Ownership invariants

1. A restaurant has exactly one `ownerId`, taken from the authenticated user.
2. Only that owner may read `mine`, create, or update the restaurant.
3. A menu item belongs to one restaurant and cannot move between restaurants.
4. A menu category belongs to one restaurant; the service checks the pair.
5. Driver profiles have no restaurant ownership.
6. Role, approval status and platform-owned fields are never writable through a
   client DTO.
7. An order's `customerId` is taken from the token; every total is recalculated
   server-side at creation.
8. A delivery is unique per order, and a driver holds at most one
   `activeDeliveryId`. Assignment is a conditional atomic update on the driver
   profile.
9. A `promotion_redemptions` row is unique per order, so a retried order cannot
   consume a promotion twice.
