# Ronak By Ali: Database Structure (v2)

One database (`ronakByAliDatabaseId`), 9 tables, and 1 storage bucket (`ronakByAliBucketId`) for **all** images.

## Rules

- Column names are **case-sensitive**. Spell them exactly as written.
- Appwrite adds `$id`, `$createdAt`, `$updatedAt` and `$permissions`. **Do not create them.**
- **Req** = tick Required. **Array** = tick Array.
- Images are stored in the bucket. Tables keep only the file ID.
- Lists of objects (order items, cart items, layout content) are JSON text in a Text column. The code does the `JSON.stringify` / `JSON.parse` for you.
- Create the columns first, the indexes after, and the permissions last.
- Optional columns: leave "Required" off. The code writes `null` for them.

## Env names used by the code (`envVars/vars`)

`ronakByAliUrl`, `ronakByAliProjectId`, `ronakByAliDatabaseId`, `ronakByAliBucketId`, `ronakByAliUsers`, `ronakByAliProducts`, `ronakByAliOrders`, `ronakByAliCart`, `ronakByAliWishlist`, `ronakByAliAlerts`, `ronakByAliSettings`, `ronakByAliLayout`

---

## 1) Users (`ronakByAliUsers`) · `user.js`

| Column | Type | Notes |
|---|---|---|
| name | String(128) | Req |
| email | Email | Req |
| username | String(40) | Req, random and unique, used as the profile slug |
| phone | String(20) | |
| role | Enum: `admin`, `support`, `manager`, `customer`, `loyal`, `new` | default `new` |
| avatarFileId | String(64) | |
| isBlocked | Boolean | default `false` |
| lastAddress | String(500) | latest address from an order (null before) |
| lastCity | String(100) | latest city from an order (null before) |
| cartId | String(36) | id of this user's row in Cart |
| wishlistId | String(36) | id of this user's row in Wishlist |
| ordersCount | Integer | default `0` |
| totalSpent | Float | default `0` |
| authProvider | Enum: `email`, `google` | default `email` |
| lastLoginAt | Datetime | |
| reviewIds | String(36) | **Array**, newest 50 review ids by this user |

**Indexes:** `email` (Unique), `username` (Unique), `role` (Key)

**Permissions:** Table Create → Users. Row security ON. Each row: the owner gets read/update/delete (the code does this). Staff: give Label `admin` (and `support` / `manager` if wanted) access on the table.

---

## 2) Products (`ronakByAliProducts`) · `product.js`

| Column | Type | Notes |
|---|---|---|
| name | String(255) | Req |
| slug | String(255) | Req, unique, used in the URL |
| description | Text | |
| originalPrice | Float | Req, price before discount |
| costPrice | Float | what it cost you (see warning below) |
| discountPercentage | Float | default `0` |
| discountName | String(100) | e.g. "Eid Sale" |
| price | Float | Req, final selling price |
| priceFormat | String(50) | e.g. "Rs 2,500" |
| priceAdvance | Float | price when paid in advance |
| priceCOD | Float | price for cash on delivery |
| deliveryCharges | Float | default `0` |
| deliveryTime | String(100) | e.g. "4-6 working days" |
| deliveryFrom | String(150) | city / location it ships from |
| category | String(100) | Req |
| group | String(100) | sub-category / collection |
| imageIds | String(64) | **Array**, all image ids; first = main image |
| tags | String(50) | **Array** |
| status | Enum: `inStock`, `outOfStock` | default `inStock` |
| totalAvailable | Integer | default `0` |
| sold | Integer | default `0` |
| remaining | Integer | default `0` (totalAvailable − sold) |
| featured | Boolean | default `false` |
| order | Integer | default `0`, drag-and-drop position |
| reviewIds | String(36) | **Array**, newest 50 approved review ids |
| reviewCount | Integer | default `0`, number of approved reviews |
| ratingAverage | Float | default `0`, min 0, max 5 |

**Indexes (Key unless noted):** `slug` (Unique), `category`, `group`, `price`, `status`, `featured`, `order`, `name`

**Permissions:** Table Read → Any. Create/Update/Delete → Label `admin`.

> **Warning:** Read → Any means anyone can read **every** column through the API, including `costPrice`. If the cost must stay private, keep it out of this table (for example in a separate admin-only table).

---

## 3) Orders (`ronakByAliOrders`) · `order.js`

| Column | Type | Notes |
|---|---|---|
| userId | String(36) | Req |
| username | String(40) | |
| orderNumber | String(30) | Req, e.g. `RBA-7K2QX9` |
| items | Text | Req, JSON `[{productId, name, price, quantity, fileId, variant}]` |
| subtotal | Float | Req |
| deliveryCharges | Float | default `0` |
| discount | Float | default `0` |
| total | Float | Req |
| advanceAmount | Float | default `0` |
| codAmount | Float | default `0` |
| status | Enum: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned` | default `pending` |
| paymentMethod | Enum: `cod`, `bank_transfer`, `card`, `easypaisa`, `jazzcash` | |
| paymentStatus | Enum: `unpaid`, `partial`, `paid`, `refunded` | default `unpaid` |
| deliveryType | Enum: `fast`, `regular`, `pickup` | default `regular` |
| deliveryTime | String(100) | |
| estimatedDelivery | Datetime | |
| customerName | String(128) | Req |
| customerEmail | Email | |
| customerPhone | String(20) | Req |
| city | String(100) | Req |
| address | String(500) | Req |
| notes | String(1000) | |
| trackingId | String(100) | |
| adminNotes | String(1000) | |

**Indexes:** `userId` (Key), `orderNumber` (Unique), `status` (Key)

**Permissions:** Table Create → Users. Read/Update/Delete → Label `admin` (add `support` / `manager` labels if they handle orders). Row security ON (the code gives the customer read on their own order).

---

## 4) Cart (`ronakByAliCart`) · `cart.js`

One row per user, and `rowId` = the user's id.

| Column | Type | Notes |
|---|---|---|
| userId | String(36) | Req |
| username | String(40) | |
| name | String(128) | |
| email | Email | |
| phone | String(20) | |
| city | String(100) | |
| address | String(500) | |
| productIds | String(36) | **Array**, products currently in the cart |
| items | Text | JSON `[{productId, quantity, variant}]` |
| itemCount | Integer | default `0` |
| purchasedProductIds | String(36) | **Array**, everything this user has bought |

**Indexes:** `userId` (Unique)

**Permissions:** Table Create → Users. Row security ON (the code gives the owner read/update/delete). Label `admin`: Read.

---

## 5) Wishlist (`ronakByAliWishlist`) · `wishlist.js`

One row per user, and `rowId` = the user's id.

| Column | Type | Notes |
|---|---|---|
| userId | String(36) | Req |
| username | String(40) | |
| name | String(128) | |
| email | Email | |
| phone | String(20) | |
| city | String(100) | |
| address | String(500) | |
| productIds | String(36) | **Array** |
| itemCount | Integer | default `0` |
| purchasedProductIds | String(36) | **Array** |

**Indexes:** `userId` (Unique)

**Permissions:** Same as Cart.

---

## 6) Settings (`ronakByAliSettings`) · `settings.js`

`rowId` = the key.

| Column | Type | Notes |
|---|---|---|
| key | String(100) | Req, unique |
| value | Text | plain text, number, true/false, or JSON |
| label | String(150) | |

**Indexes:** `key` (Unique)

**Permissions:** Table Read → Any. Create/Update/Delete → Label `admin`.

---

## 7) Layout (`ronakByAliLayout`) · `layout.js`

`rowId` = the key.

| Column | Type | Notes |
|---|---|---|
| key | String(100) | Req, unique, e.g. `hero`, `banner1`, `featured` |
| type | Enum: `hero`, `banner`, `featured`, `categories`, `products`, `text`, `custom` | Req |
| title | String(255) | |
| subtitle | String(500) | |
| content | Text | JSON for extra data (e.g. `{"body":"..."}`) |
| imageIds | String(64) | **Array**, section images (hero slides, banner image) |
| link | String(500) | |
| buttonText | String(50) | |
| category | String(100) | for `products` sections: which category |
| itemsLimit | Integer | how many products to show |
| order | Integer | Req, default `0`, position on the page |
| isActive | Boolean | default `true` |

**Indexes:** `key` (Unique), `order` (Key), `isActive` (Key)

**Permissions:** Table Read → Any. Create/Update/Delete → Label `admin`.

---

## 8) Alerts (`ronakByAliAlerts`) · `alert.js`

| Column | Type | Notes |
|---|---|---|
| userId | String(36) | empty = everyone, filled = only that user |
| title | String(150) | Req |
| message | String(1000) | Req |
| type | Enum: `info`, `success`, `warning`, `error`, `promo` | default `info` |
| status | Enum: `active`, `inactive` | default `active` |
| popup | Boolean | default `false`, `true` = show as a popup |
| link | String(500) | |
| buttonText | String(50) | default `Got it`, the "seen" button |
| priority | Integer | default `0`, higher shows first |
| impressions | Integer | default `0`, times it was shown |
| seenCount | Integer | default `0`, times the "seen" button was pressed |
| seenBy | String(36) | **Array**, user ids who pressed "seen" |
| startsAt | Datetime | |
| endsAt | Datetime | |

**Indexes:** `status` (Key), `popup` (Key), `userId` (Key), `priority` (Key)

**Permissions:** Table Read → Any. Create/Delete → Label `admin`. Update → Label `admin` **and** Users (needed so impressions and seen counts can be recorded).

> **Note:** Giving Users the Update permission means any logged-in user could edit alerts. Guests can't be counted at all. If that is a concern, move `trackImpression` and `markSeen` to an Appwrite Function later.

---

## 9) Reviews (`ronakbyali_reviews`) · `review.js`

| Column | Type | Notes |
|---|---|---|
| productId | String(36) | Req, the product this review is about |
| productName | String(255) | copied from the product |
| productSlug | String(255) | copied from the product |
| userId | String(36) | Req, the reviewer |
| username | String(40) | |
| reviewerName | String(128) | |
| reviewerAvatarId | String(64) | |
| rating | Integer | Req, 1 to 5 |
| title | String(150) | |
| message | String(2000) | Req |
| imageIds | String(64) | **Array**, optional photos (max 3) |
| isVerifiedPurchase | Boolean | default `false` |
| orderId | String(36) | |
| status | Enum: `pending`, `approved`, `rejected` | default `pending` |
| adminReply | String(1000) | |
| repliedAt | Datetime | |

**Indexes:** `productId` (Key), `userId` (Key), `status` (Key), `rating` (Key), `userId + productId` (Unique, one review per user per product)

**Permissions:** Table Create → Users. Read/Update/Delete → Label `admin`. Row security ON. The code gives the author read/update/delete on their own review, and adds read → Any when an admin approves it.

---

## Storage bucket (`ronakByAliBucketId`)

- **Read:** Any
- **Create:** Users (for avatars)
- **Update/Delete:** Label `admin`
- **Allowed extensions:** jpg, jpeg, png, webp
- **Max size:** 5 MB

Also add **Delete → Users** if customers should be able to replace their own avatar (the code deletes the old avatar file).

---

# Appwrite JavaScript API reference

This section documents the code in every `.js` file in this folder: what each service does, how to call it, what it returns, and which related records it changes. It is intended as an implementation guide, not only a database schema.

## 10) Shared conventions and setup

### Configuration and service instances

Every service builds an Appwrite `Client` using `ronakByAliUrl` and `ronakByAliProjectId` from `env/var.js`. Database operations use `ronakByAliDatabaseId` plus the service's table ID; file operations use `ronakByAliBucketId`.

The normal import is the ready-to-use singleton, for example:

```js
import { productService, authService } from './lib/appwrite';

const product = await productService.getProductBySlug('rose-lawn-suit');
const profile = await authService.getCurrentProfile();
```

Services are also named exports as classes (for example `ProductService`) in their individual files. `index.js` re-exports the singleton instances and selected constants; it does not export the classes.

### Results and errors

- Most service methods catch Appwrite errors, write the error message to `console.error`, and return `false`, `null`, an empty array, or an empty result object as described below.
- A `false` result usually means the operation failed or the requested row was not available. For list APIs, check the documented `rows` and `total` fields instead.
- `authService` and `reviewService` also expose `lastError` for user-facing messages after high-level authentication or review operations.
- Validation failures may return `false` without making an Appwrite request.
- Authentication does not grant authorization by itself. Configure the table, row, storage, and label permissions in Appwrite as described in the schema sections above.
- Inputs are plain JavaScript objects and Appwrite `File` objects; no custom DTO classes are required.
- OAuth defaults and alert seen/dismiss tracking use browser APIs (`window`, `localStorage`, and `sessionStorage`); those operations are intended for the browser, not server-side rendering.

### Typical setup and use

```js
import {
  authService,
  productService,
  cartService,
  orderService,
} from './lib/appwrite';

const profile = await authService.signIn({ email, password });
if (!profile) {
  // Show authService.lastError.
} else {
  const product = await productService.getProductBySlug('rose-lawn-suit');
  if (product) {
    await cartService.addItem({
      profile,
      productId: product.$id,
      quantity: 1,
    });
  }
}
```

IDs in `rowId` arguments are Appwrite row IDs (`$id`), except settings and layout rows, whose IDs are derived from their key. Product-facing methods that explicitly say `slug` take a product slug instead.

## 11) `index.js` — service barrel

Import from this file to avoid importing each service module individually.

| Export | Meaning |
|---|---|
| `productService` | Product records, inventory, product images, and product queries. |
| `service` | Backward-compatible alias for `productService`. |
| `authService` | Appwrite Auth sessions, email/OAuth sign-in, account updates, and recovery. |
| `userService` | Profile rows, roles, profile search, and avatars. |
| `orderService` | Order placement, retrieval, status/payment changes, and stock effects. |
| `cartService` | Per-user cart records and cart item operations. |
| `wishlistService` | Per-user wishlist records and wishlist item operations. |
| `alertService` | Announcement alerts, popups, seen/dismiss tracking, and admin CRUD. |
| `settingsService` | Store-wide key/value settings and logo management. |
| `layoutService` | Homepage sections, their ordering/content, and section images. |
| `reviewService` | Customer reviews, public rating data, moderation, and review images. |

It also re-exports `ROLES`, `STAFF_ROLES`, `LOYAL_AFTER_ORDERS`, `PRODUCT_STATUS`, `ORDER_STATUS`, `PAYMENT_METHODS`, `PAYMENT_STATUS`, `DELIVERY_TYPES`, `ALERT_TYPES`, `ALERT_STATUS`, `DEFAULT_SETTINGS`, `SECTION_TYPES`, and `DEFAULT_SECTIONS`.

The default export is an object containing the same service instances as the named exports, including the backward-compatible `service` alias. Constants are named exports only.

## 12) `auth.js` — authentication

`authService` wraps Appwrite `Account`. High-level successful sign-in/sign-up calls return the **profile row**, not the raw Auth user. Profile setup is delegated to `userService.ensureProfile()`.

### High-level flows

| Method | Input | Result and behavior |
|---|---|---|
| `signUp({ email, password, name })` | Email credentials and display name. | Creates an Appwrite Auth account, starts an email/password session, creates/loads the profile, and returns that profile. Returns `false` on failure; inspect `lastError`. |
| `signIn({ email, password })` | Email credentials. | Starts a session, ensures the user's profile exists, and returns the profile. A blocked profile is logged out and returns `false`. |
| `continueWithEmail({ email, password, name })` | `name` is optional and indicates sign-up fallback. | Tries sign-in first. If that fails and `name` is supplied, tries sign-up. If no name is supplied, behaves as sign-in only. |
| `continueWithGoogle({ successUrl, failureUrl } = {})` | Optional redirect URLs. | Starts Google OAuth in the browser; defaults to `/auth/callback` and `/login` on the current origin. Returns whether the redirect request was initiated, not a logged-in profile. |
| `completeLogin()` | None. | Completes the OAuth callback or restores an existing session, ensures the profile, and returns it or `false`. Call on the OAuth success route and when restoring the session. |
| `getCurrentProfile()` | None. | Returns the profile associated with the current Auth user, or `false` for a guest/missing profile. Does not create a profile. |

All high-level flows reset `lastError` at the start; failures set and log it. Sign-in maps Appwrite code `401` to a wrong-email-or-password message; sign-up maps `409` to an existing-email message.

### Low-level session and account methods

| Method | Input | Result and behavior |
|---|---|---|
| `createAccount({ email, password, name })` | Account fields. | Low-level creation; attempts to log in after creating and returns the raw Auth user or `false`. Prefer `signUp()` for normal UI use. |
| `login({ email, password })` | Email credentials. | Returns the Appwrite session object or `false`; does not ensure a profile. |
| `loginWithOAuth({ provider, successUrl, failureUrl } = {})` | Appwrite OAuth provider and redirect URLs. | Starts the OAuth redirect and returns `true`/`false`. |
| `logout()` | None. | Deletes the current session; returns `true`/`false`. |
| `logoutAll()` | None. | Deletes every session for the current account; returns `true`/`false`. |
| `getCurrentUser()` | None. | Returns the raw Appwrite Auth user, or `false`. A `401` is treated as a normal guest state. |
| `isLoggedIn()` | None. | Boolean indicating whether `getCurrentUser()` returned a user. |
| `listSessions()` | None. | Returns the current account's session array, or `false` on error. |
| `deleteSession({ sessionId })` | Appwrite session ID. | Deletes that session and returns `true`/`false`. |

### Account fields, preferences, verification, and recovery

| Method | Input | Result and behavior |
|---|---|---|
| `updateName({ name })` | New Auth display name. | Updates the Appwrite Auth account and returns the updated Auth user or `false`. It does not update the profile row. |
| `updateEmail({ email, password })` | New email and current password. | Updates the Auth email; returns the Auth user or `false`. Update the separate profile email if the application needs it synchronized. |
| `updatePhone({ phone, password })` | Phone in international format, e.g. `+923001234567`, and current password. | Updates Auth phone; returns the Auth user or `false`. |
| `updatePassword({ oldPassword, newPassword })` | Current and new passwords. | Updates Auth password; returns the Auth user or `false`. |
| `getPrefs()` | None. | Returns the Auth preferences object or `false`. |
| `updatePrefs({ prefs })` | Complete preferences object. | Replaces the full preferences object; returns the updated Auth user or `false`. |
| `updatePref({ key, value })` | One preference entry. | Reads current preferences and merges one key/value; returns the updated Auth user or `false`. |
| `sendVerification({ url } = {})` | Optional URL for the verification link; default is `/verify` on the current origin. | Sends an email verification request and returns Appwrite's response or `false`. |
| `confirmVerification({ userId, secret })` | Values from the verification callback. | Confirms the email address; returns Appwrite's response or `false`. |
| `sendPasswordRecovery({ email, url = \`${window.location.origin}/reset-password\` })` | Email and optional recovery URL; default is `/reset-password` on the current origin. | Sends a password recovery email; returns Appwrite's response or `false`. |
| `confirmPasswordRecovery({ userId, secret, password })` | Callback values and new password. | Completes recovery and returns Appwrite's response or `false`. |

## 13) `user.js` — profile rows, roles, and avatars

Appwrite Auth owns credentials; this service owns the application's Users table. A profile row ID is the Auth user's `$id`. Creating a new profile also creates its cart and wishlist, then stores their IDs on the profile.

### Roles

- `ROLES`: `ADMIN`, `SUPPORT`, `MANAGER`, `CUSTOMER`, `LOYAL`, `NEW`; values are `admin`, `support`, `manager`, `customer`, `loyal`, `new`.
- `STAFF_ROLES`: `admin`, `support`, `manager`. Staff roles are never changed by order-count calculations.
- `LOYAL_AFTER_ORDERS`: `2`. Non-staff users become `customer` after one order and `loyal` after two or more.

### Profile methods

| Method | Input | Result and behavior |
|---|---|---|
| `createProfile({ userId, data = {} })` | Auth user ID and optional profile values. | Creates row `rowId = userId`, generates a unique username if not provided, applies defaults, creates cart/wishlist records, and links them. Returns the profile or `false`. It retries username conflicts up to six attempts. |
| `ensureProfile({ user, defaults = {} })` | Raw Auth user and optional profile defaults. | Finds by Auth ID, then email; existing profiles get a fresh `lastLoginAt`. Otherwise creates a profile using Auth name/email and defaults. Returns profile or `false`. |
| `getProfile({ userId })` | Profile/Auth user ID. | Returns one profile row or `false`; missing rows are not logged as errors. |
| `updateProfile({ userId, data })` | Profile row ID and partial column patch. | Returns the updated row or `false`. |
| `deleteProfile({ userId })` | Profile row ID. | Deletes only the profile row; it does not delete the Auth account, orders, cart, wishlist, or avatar. Returns `true`/`false`. |
| `getProfileByEmail({ email })` | Email. | Finds one matching profile or returns `false`. |
| `getProfileByUsername({ username })` | Public username/slug. | Finds one matching profile or returns `false`. |
| `toPublicProfile(profile)` | Profile row or falsy value. | Returns only `$id`, `name`, `username`, `avatarFileId`, `role`, and `$createdAt`; returns `null` for no profile. Use this rather than exposing the complete private profile. |
| `isUsernameAvailable(username)` | Candidate username. | Returns `true` if no visible row uses it. On query error returns `false` (fail closed). The unique index is the ultimate collision guard. |
| `generateUniqueUsername(seed, longer = false)` | Name/email-like seed; optional longer numeric suffix. | Produces a normalized base plus four random digits, or six when `longer` is true. Tries up to eight candidates; returns a username or `false`. |

`createProfile` defaults include role `new`, `isBlocked: false`, zero orders/spend, `authProvider: 'email'`, and empty/null contact and address fields. A caller can override defaults using `data`.

### Roles, orders, and admin profile lists

| Method | Input | Result and behavior |
|---|---|---|
| `computeRole(currentRole, ordersCount)` | Current role and total order count. | Preserves a staff role; otherwise returns `loyal`, `customer`, or `new` based on the thresholds above. |
| `applyOrderToProfile({ profile, order })` | Profile and newly created order rows. | Increments `ordersCount`, adds order total to `totalSpent`, records the latest phone/city/address, and recalculates the role. Returns updated profile or `false`. Called by order placement. |
| `setRole({ userId, role })` | User row ID and a value from `ROLES`. | Validates the role, updates profile, or returns `false`. Intended for admins. |
| `setBlocked({ userId, isBlocked })` | User ID and boolean-like value. | Updates `isBlocked` as a boolean; returns updated profile or `false`. |
| `getProfilesPage({ role, limit = 25, offset = 0 } = {})` | Optional role and pagination. | Newest-first `{ rows, total }`; errors yield `{ rows: [], total: 0 }`. |
| `getProfiles({ role } = {})` | Optional exact role filter. | Loads all matching profiles by cursor pagination; returns rows or `false`. |
| `searchProfiles({ term, role } = {})` | Optional term and role. | Loads all matching role rows, then case-insensitively searches name, email, username, and phone in memory. Returns matching rows or `false`. |

### Avatar methods

| Method | Input | Result and behavior |
|---|---|---|
| `uploadAvatar({ file })` | Browser `File`. | Uploads to the configured bucket and returns the Appwrite file object or `false`. |
| `deleteAvatar({ fileId })` | Storage file ID. | Deletes the file; returns `true`/`false`. |
| `getAvatarUrl({ fileId })` | Storage file ID. | Synchronous file-view URL for JSX, or `null` for a missing ID/error. |
| `changeAvatar({ userId, file, oldFileId })` | Profile ID, new `File`, and optional previous file ID. | Uploads new avatar, updates `avatarFileId`, rolls back the new upload if profile update fails, then deletes the old file. Returns updated profile or `false`. |

## 14) `product.js` — products, inventory, queries, and images

`PRODUCT_STATUS` values are `IN_STOCK: 'inStock'` and `OUT_OF_STOCK: 'outOfStock'`. Product images are files in the configured bucket; product rows contain IDs in `imageIds`, where the first ID is the main image.

### Price and product data helpers

| Method | Input | Result and behavior |
|---|---|---|
| `formatPrice(value, currency = 'Rs')` | Number-like price and optional currency prefix. | Returns a display string such as `Rs 2,500` using `en-PK` formatting. |
| `prepareProductData(data = {})` | Product field object. | Returns a copy with derived values: calculates `price` only when absent, fills `priceFormat` if absent, and when `totalAvailable` is supplied recalculates `sold`, `remaining`, and `status`. |

### Product writes and inventory

| Method | Input | Result and behavior |
|---|---|---|
| `addProduct(data)` | New product fields. | Applies `prepareProductData`, creates a unique row, and returns it or `false`. |
| `addProducts(items)` | Array of product objects. | Creates in batches of 10 and returns an array of Appwrite results or `false`. |
| `updateProduct(rowId, data)` | Product row ID and partial data. | Updates a row and returns it or `false`. Does not automatically run `prepareProductData`. |
| `updateProducts(updates)` | `[{ id, data }, ...]`. | Applies updates in batches of 10; returns `true` or `false`. |
| `updateProductOrder(updates)` | `[{ id, order }, ...]`. | Convenience wrapper that updates only each product's `order`; returns `true`/`false`. |
| `updateStock(rowId, { totalAvailable, sold })` | Product ID and either/both stock numbers. | Loads existing stock, computes `remaining = max(0, totalAvailable - sold)`, derives status, saves and returns the updated row or `false`. |
| `adjustStock(rowId, soldDelta)` | Product ID and signed change to `sold`. | Adds delta to sold count, clamps sold to zero, then calls `updateStock`. Used by order status transitions. |
| `deleteProduct(rowId, deleteFiles = true)` | Product ID and optional image cleanup flag. | Deletes the row and, by default, deletes its image files. Returns `true`/`false`. |
| `deleteProducts(rowIds, deleteFiles = true)` | Array of product IDs. | Deletes in batches of 10; returns true only if all operations succeed. |

### Product reads and search

| Method | Input | Result and behavior |
|---|---|---|
| `getProduct(rowId)` | Product row ID. | Product row or `false`. |
| `getProductBySlug(slug)` | URL slug. | First matching product or `false`. |
| `getProductsByIds(ids)` | Product row IDs. | Deduplicates IDs, fetches groups of at most 100, and returns matching product rows or `false`. Result ordering is Appwrite's list order, not guaranteed to match the input ID order. |
| `getProducts(filters = {})` | Exact column-value filters, e.g. `{ category: 'Lawn', status: 'inStock' }`. | All matching products via cursor pagination, or `false`. Empty/null filters are ignored. |
| `countProducts(filters = {})` | Exact column-value filters. | Matching total count; returns `0` on error. |
| `getProductsPage({ filters = {}, minPrice, maxPrice, sortBy = 'name-asc', limit = 35, offset = 0 } = {})` | Filter, price range, sorting, and pagination options. | `{ rows, total }`; errors yield empty rows and zero total. |
| `searchProducts(options = {})` | Same options as `getProductsPage`, plus `term`. | Searches name, description, category, group, and tags case-insensitively in memory. It first loads all rows matching filters/price range, sorts in memory, then slices the page. Empty term delegates to `getProductsPage`. |
| `getFeaturedProducts(limit = 8)` | Max result count. | Products with `featured === true`, ordered by `order` ascending; array or `false`. |
| `getRelatedProducts(product, limit = 8)` | Product row and max count. | Other products in the same category; returns an array, `[]` if category is absent, or `false` on query failure. |

`sortBy` accepts `name-asc`, `name-desc`, `price-asc`, `price-desc`, `newest`, or `order`. Price bounds are inclusive. Filter keys must be actual Appwrite column names.

### Category, group, price range, and slugs

| Method | Input | Result and behavior |
|---|---|---|
| `listCategories(filters = {})` | Optional exact product filters. | Object `{ categoryName: productCount }`, or `false`. |
| `listGroups(filters = {})` | Optional exact filters. | Object `{ groupName: productCount }`, or `false`. |
| `listCategoriesWithSample(filters = {})` | Optional exact filters. | Array of `{ name, count, sampleFileId, sampleCategory }`; sample image is the first encountered product image ID. |
| `listGroupsWithSample(filters = {})` | Optional exact filters. | Same summary shape grouped by `group`; includes each sample's category. |
| `getPriceRange(filters = {})` | Optional exact filters. | `{ min, max }`; empty products or errors return `{ min: 0, max: 0 }`. |
| `isSlugAvailable(slug, excludeRowId)` | Candidate slug and optional product ID being edited. | Boolean. Existing matching row is allowed only when it is the excluded row; errors return `false`. |
| `getAllSlugs()` | None. | A `Set` of non-empty product slugs; errors return an empty set. |
| `generateUniqueSlug(text, excludeRowId)` | Product name/text and optional edited product ID. | Lowercase hyphenated slug, adding `-2`, `-3`, etc. as needed; returns `false` if it cannot find one. |

### Product images

| Method | Input | Result and behavior |
|---|---|---|
| `uploadImage(file)` | One browser `File`. | Appwrite file row or `false`. |
| `uploadImages(files)` | Array of browser `File` objects. | Uploads in batches of five and returns file rows in input order or `false`. |
| `deleteImage(fileId)` | File ID or supported Appwrite file-view URL. | Extracts the ID, deletes the storage file, and returns `true`/`false`. |
| `deleteImages(fileIds)` | Array of IDs/URLs. | Deletes in batches of 10; returns true only if all succeed. |
| `getImageUrl(fileId)` | File ID or supported file-view URL. | Synchronous view URL or `null`. |
| `getMainImageUrl(product)` | Product row. | View URL for `imageIds[0]`, or `null`. |
| `getImageUrls(product)` | Product row. | Array of non-null view URLs corresponding to `imageIds`. |
| `addImages(rowId, files)` | Product row ID and files. | Uploads and appends IDs; if saving the product fails, deletes newly uploaded files. Returns updated row or `false`. |
| `removeImage(rowId, fileId)` | Product ID and image ID. | Removes the ID from the product and deletes the file after the row update succeeds. |
| `setMainImage(rowId, fileId)` | Product ID and one of its existing image IDs. | Moves that ID to the front of `imageIds`; returns updated row or `false`. |

Deleting a product does not delete its reviews; call `reviewService.deleteReviewsForProduct(productId)` separately when full cleanup is intended.

## 15) `cart.js` — per-user shopping carts

There is one cart row per user, with row ID equal to the user's profile ID. Cart `items` are stored as JSON text; an item is `{ productId, quantity, variant }`. The `productIds` array is unique product IDs, and `itemCount` is the sum of quantities.

| Method | Input | Result and behavior |
|---|---|---|
| `getCart({ userId })` | Profile/user ID. | Cart row or `false`; a missing row is treated as normal and not logged. |
| `createCart({ profile })` | User profile row. | Creates a row with copied user contact/address fields, empty arrays/items, owner read/update/delete permissions. If it already exists, returns the existing cart. |
| `getOrCreateCart({ profile })` | User profile row. | Gets the cart or creates it for older accounts. |
| `syncProfile({ profile })` | Updated profile. | Refreshes the cart's copied username/name/email/phone/city/address fields; returns updated row or `false`. |
| `parseItems(cart)` | Cart row. | Parses `items` JSON and returns an array; malformed/missing JSON returns `[]`. |
| `addItem({ profile, productId, quantity = 1, variant = null })` | Profile, product ID, quantity, optional variant. | Creates cart if needed. Adds quantity to the existing matching product+variant line, or appends a new line. Non-numeric/zero-like quantity falls back to 1. Returns updated cart or `false`. |
| `setQuantity({ userId, productId, quantity, variant = null })` | User ID, product ID, new quantity, optional variant. | Sets the matching line's quantity; lines with quantity `<= 0` are removed. Returns updated cart or `false`. |
| `removeItem({ userId, productId, variant = null })` | User ID, product ID, variant. | Equivalent to setting that line's quantity to zero. |
| `clear({ userId })` | User ID. | Saves an empty item list and clears product IDs/count. |
| `getCartWithProducts({ userId })` | User ID. | Returns `{ cart, lines, subtotal }`. Each line contains its cart fields plus current `product` row; products that no longer exist are omitted. Subtotal uses current product prices. Missing cart/errors return `{ cart: false, lines: [], subtotal: 0 }`. |
| `markPurchased({ userId, productIds })` | User ID and purchased product IDs. | Removes every cart line for those products and adds IDs to the deduplicated `purchasedProductIds` array. Returns updated row or `false`. |

`addItem` and `getOrCreateCart` expect the profile object returned by `authService`, not only a user ID. Call `syncProfile` after updating profile contact/address fields if the copied cart columns are used elsewhere.

## 16) `wishlist.js` — per-user wishlists

There is one wishlist row per user, also keyed by user ID. `productIds` contains wished product IDs; `purchasedProductIds` is a deduplicated history.

| Method | Input | Result and behavior |
|---|---|---|
| `getWishlist({ userId })` | User/profile ID. | Wishlist row or `false`; missing row is not logged. |
| `createWishlist({ profile })` | User profile. | Creates an owner-permissioned row with copied contact/address snapshot and empty product/purchase arrays. If it already exists, returns it. |
| `getOrCreateWishlist({ profile })` | User profile. | Returns existing wishlist or creates one. |
| `syncProfile({ profile })` | Updated profile. | Refreshes copied user fields on the wishlist row. |
| `add({ profile, productId })` | Profile and product ID. | Creates row if needed; adds the product if not already present. Returns the wishlist unchanged if already wished. |
| `remove({ userId, productId })` | User ID and product ID. | Removes that ID and updates `itemCount`; returns updated row or `false`. |
| `toggle({ profile, productId })` | Profile and product ID. | Toggles membership; returns `{ wished: true|false, wishlist }` or `false`. |
| `has({ userId, productId })` | User ID and product ID. | Boolean membership check. |
| `clear({ userId })` | User ID. | Clears wished product IDs and count. |
| `getWishlistWithProducts({ userId })` | User ID. | Returns `{ wishlist, products }` with current product rows. If no list or on error returns `{ wishlist: false, products: [] }`. |
| `markPurchased({ userId, productIds })` | User ID and bought product IDs. | Adds product IDs to `purchasedProductIds` without removing them from the wishlist. Returns updated row or `false`. |

## 17) `order.js` — checkout, orders, and stock changes

Exported constants:

- `ORDER_STATUS`: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`.
- `PAYMENT_METHODS`: `cod`, `bank_transfer`, `card`, `easypaisa`, `jazzcash`.
- `PAYMENT_STATUS`: `unpaid`, `partial`, `paid`, `refunded`.
- `DELIVERY_TYPES`: `fast`, `regular`, `pickup`.

An order's `items` column is JSON. Place-order callers provide item snapshots (`productId`, `name`, `price`, `quantity`, optional `fileId` and `variant`) so historical order descriptions/prices do not change with the product row.

### Customer checkout and reads

| Method | Input | Result and behavior |
|---|---|---|
| `placeOrder({ profile, items, form = {} })` | Logged-in profile, non-empty snapshot items, checkout form. | Calculates subtotal, delivery charges, discount, total, advance, COD balance, status and payment status; generates a unique order number and creates an order readable by its customer. After creation it best-effort updates profile totals/contact/role and marks purchased IDs in cart and wishlist. Returns order row or `false`. |
| `generateOrderNumber()` | None. | Generates an `RBA-` prefix plus six random characters from an ambiguity-reduced alphabet. |
| `getOrder(rowId)` | Order row ID. | Order row or `false`. |
| `getOrderByNumber(orderNumber)` | Public order number. | Matching row or `false`. |
| `getUserOrders({ userId, limit = 25, offset = 0 })` | User ID and pagination. | Delegates to `getOrdersPage` filtered by user ID; returns `{ rows, total }`. Row/table permissions must enforce customer access. |
| `getOrdersPage({ limit = 25, offset = 0, ...filters } = {})` | Pagination plus exact filters such as `status`, `paymentStatus`, `paymentMethod`, `deliveryType`, `userId`, or `city`. | Newest-first `{ rows, total }`; on error returns empty rows/zero total. |
| `countOrders(filters = {})` | Same exact filters. | Total matching orders. |
| `searchOrders({ term, status } = {})` | Optional search term and status. | Loads all matching status rows, then case-insensitively searches order number, customer name/phone/email, username, and tracking ID. Returns array or `false`. |
| `parseItems(order)` | Order row. | Parsed items array; malformed/missing JSON returns `[]`. |

The `form` accepted by `placeOrder` supports `customerName`, `customerPhone`, `customerEmail`, `city`, `address`, `paymentMethod`, `deliveryType`, `deliveryTime`, `estimatedDelivery`, `deliveryCharges`, `discount`, `advanceAmount`, and `notes`. Defaults include COD, regular delivery, pending status, and profile contact details where available. `total` is clamped at zero and `advanceAmount` cannot exceed total.

### Admin updates

| Method | Input | Result and behavior |
|---|---|---|
| `updateOrder(rowId, data)` | Order ID and partial column patch. | Returns updated order row or `false`. |
| `updateStatus(rowId, status, { adjustStock = true } = {})` | Order ID, valid status, optional stock flag. | Updates status; COD becomes paid when delivered. Stock is deducted when an order moves from a non-stock-taking status (`pending`, `cancelled`, `returned`) to any other status, and restored on the reverse transition. Calls `productService.adjustStock` for each item. Returns updated order or `false`. |
| `updatePaymentStatus(rowId, paymentStatus)` | Order ID and one of `PAYMENT_STATUS`. | Validates then updates payment status; updated row or `false`. |
| `setTracking(rowId, trackingId)` | Order ID and tracking string. | Saves tracking ID; updated row or `false`. |
| `setAdminNotes(rowId, adminNotes)` | Order ID and notes. | Saves internal admin notes; updated row or `false`. |
| `cancelOrder(rowId)` | Order ID. | Convenience call to `updateStatus(rowId, 'cancelled')`; stock is restored if it had previously been deducted. |
| `deleteOrder(rowId)` | Order ID. | Deletes row and returns `true`/`false`. Does not automatically reverse stock or user totals. |

Stock is only adjusted when the status crosses between the stock-excluded group and the stock-taking group. Changes within either group do not adjust stock. Failed post-order side effects do not roll back an already created order.

## 18) `alert.js` — announcements, popups, and seen state

`ALERT_TYPES` is `info`, `success`, `warning`, `error`, `promo`. `ALERT_STATUS` has `ACTIVE: 'active'` and `INACTIVE: 'inactive'`. Alerts can be global (`userId` empty) or targeted at one user.

| Method | Input | Result and behavior |
|---|---|---|
| `getActiveAlerts({ userId } = {})` | Optional current user ID. | Up to 50 active non-popup alerts, priority descending, then filters date window and target user. Returns array or `[]`. |
| `getPopupAlerts({ userId } = {})` | Optional user ID. | Up to 50 active popup alerts, priority descending, filtered to live/targeted alerts and excluding alerts already seen or dismissed for this browser session. Returns array or `[]`. |
| `getPopupAlert({ userId } = {})` | Optional user ID. | First popup from `getPopupAlerts`, or `null`. |
| `hasSeen(alert, userId)` | Alert row and optional user ID. | True if user ID is in row `seenBy` or alert ID is in this browser's local-storage `rba_seen_alerts`. |
| `trackImpression(alert)` | Alert row. | Increments `impressions` once per browser session per alert. Returns updated row, `false` if already counted this session, or `false` on failure. |
| `markSeen({ alert, userId })` | Alert row and optional signed-in user ID. | Records alert ID in browser local storage and increments `seenCount`; for a logged-in user, also adds them to `seenBy` if absent. Returns updated row or `false`. |
| `dismiss(alertId)` | Alert ID. | Marks dismissed in session storage only; it will be eligible again in a later browser session. Returns `true`. |
| `createAlert(data)` | Required title/message and optional alert columns. | Creates an alert with defaults: info, active, non-popup, button “Got it”, priority/counters zero, empty seen list, global audience. Returns row or `false`. |
| `getAlert(rowId)` | Alert row ID. | Row or `false`. |
| `updateAlert(rowId, data)` | Alert ID and partial patch. | Updated row or `false`. |
| `setStatus(rowId, status)` | Alert ID and `active`/`inactive`. | Validates status then updates; invalid values return `false`. |
| `resetSeen(rowId)` | Alert ID. | Clears `seenBy` and resets `seenCount` to zero. It does not clear browser local storage, so users whose browser has the alert ID in `rba_seen_alerts` still count as having seen it there. |
| `deleteAlert(rowId)` | Alert ID. | Deletes row; returns `true`/`false`. |
| `getAlertsPage({ limit = 25, offset = 0, ...filters } = {})` | Pagination and optional exact filters, e.g. status/popup/type. | Newest-first `{ rows, total }`; errors yield empty result. |

The “Got it” action persists across visits in local storage and, when signed in, across devices via `seenBy`. Dismissal with X/outside click is session-only. Storage access is guarded so blocked browser storage does not crash these helpers. Guests cannot be identified in `seenBy`.

## 19) `settings.js` — store configuration

Settings rows use a deterministic row ID derived from the setting key. Values are stored in the `value` text column: objects/arrays become JSON, booleans become `true`/`false`, and other values become strings. Decoding recognizes booleans, JSON objects/arrays, and short numeric strings; phone-like strings with leading zeroes remain strings.

`DEFAULT_SETTINGS` is the seed list, including store name, contact details, currency, shipping thresholds/times, COD/maintenance flags, social links, and logo file ID.

| Method | Input | Result and behavior |
|---|---|---|
| `getSetting(key, fallback = null)` | Key and optional fallback. | Decoded single value or fallback when absent/error. |
| `getAllSettings({ refresh = false } = {})` | Optional cache bypass. | Returns `{ [key]: decodedValue }`, cached until a write or `refresh: true`; errors return cached data or `{}`. |
| `getSettingRows()` | None. | All raw setting rows, including labels; returns array or `false`. |
| `setSetting(key, value, label)` | Key/value and optional admin display label. | Updates existing row or creates a new row; invalidates cache. Returns Appwrite row or `false`. |
| `setSettings(values)` | Object of key/value pairs. | Attempts to save entries in batches of five. Returns `true` if the batches complete and `false` if an exception escapes; individual `setSetting` failures are returned as values and do not necessarily make this method return `false`. |
| `deleteSetting(key)` | Setting key. | Deletes its row and invalidates cache; returns `true`/`false`. |
| `seedDefaults()` | None. | Creates only missing defaults; existing values are preserved. Returns `true`/`false`. |
| `getNumber(key, fallback = 0)` | Key and numeric fallback. | Converts setting to finite number, otherwise returns fallback. |
| `getDeliveryCharges(subtotal)` | Cart subtotal. | Returns zero when positive `freeShippingAbove` is reached; otherwise returns `shippingFee`. |
| `getWhatsappLink(message = '')` | Optional message. | Builds `https://wa.me/<digits>` with encoded `?text=` when a configured WhatsApp number exists; otherwise `null`. |
| `getLogoUrl(fileId)` | Storage file ID. | Synchronous bucket file-view URL or `null`. |
| `changeLogo(file)` | New browser `File`. | Uploads, saves its ID as `logoFileId`, removes the new upload if saving fails, and then best-effort deletes the old logo. Returns uploaded file or `false`. |

## 20) `layout.js` — homepage section management

`SECTION_TYPES`: `hero`, `banner`, `featured`, `categories`, `products`, `text`, `custom`. `DEFAULT_SECTIONS` seeds a hero, featured products, categories, new arrivals, and a banner. `content` is a JSON-backed free-form object; `imageIds` is an ordered list of bucket file IDs.

| Method | Input | Result and behavior |
|---|---|---|
| `getLayout({ activeOnly = false } = {})` | Optional active-only filter. | All sections ordered by `order`, up to 100; returns array or `false`. |
| `getHomepageSections()` | None. | Active sections with `content` parsed and `imageUrls` added, ready for rendering; returns `[]` if layout cannot load. |
| `getSection(key)` | Section key or row ID. | Fetches one row using the service's key-to-row-ID sanitizer; returns row or `false`. |
| `createSection(data)` | Section type plus optional fields (`title`, `subtitle`, `link`, `buttonText`, `category`, `itemsLimit`, `content`, `isActive`, `key`). | Validates type, creates unique-ish key if absent, sets default active/images/content, and appends at `order = current section count`. Returns row or `false`. |
| `updateSection(rowId, data)` | Section row ID and partial patch; `content` may be an object. | JSON-encodes object content and updates row; returns row or `false`. |
| `deleteSection(rowId, deleteFiles = true)` | Section ID and optional image cleanup. | Deletes row, optionally deletes its images, and normalizes remaining order. Returns `true`/`false`. |
| `setActive(rowId, isActive)` | Section ID and active flag. | Updates visibility without deleting the section. |
| `seedDefaultLayout()` | None. | Seeds `DEFAULT_SECTIONS` only when there are no layout rows; returns the resulting rows or `false`. |
| `reorderSections(orderedIds)` | Complete ordered array of section row IDs. | Updates only changed positions in groups of 10; returns `true`/`false`. IDs not in the current layout are ignored. |
| `moveSection(rowId, toIndex)` | Section ID and zero-based destination index. | Moves one section and persists the resulting order; returns `false` if section is missing. |
| `moveUp(rowId)` / `moveDown(rowId)` | Section ID. | Moves one position; at the boundary, returns `true` without changing order. |
| `moveToTop(rowId)` / `moveToBottom(rowId)` | Section ID. | Moves to first/last position. |
| `parseContent(section)` | Section row. | Parses `content` as an object; invalid or non-object JSON returns `{}`. |
| `updateContent(rowId, partial)` | Section ID and object of content keys to merge. | Reads current content, merges the supplied keys, and saves it; returns updated section or `false`. |
| `uploadImage(file)` | Browser `File`. | Uploads one section image and returns file row or `false`. |
| `deleteImage(fileId)` | File ID. | Deletes storage file; returns `true`/`false`. |
| `getImageUrl(fileId)` | File ID. | Synchronous view URL or `null`. |
| `getImageUrls(section)` | Section row. | Ordered array of non-null URLs for its image IDs. |
| `addImages(rowId, files)` | Section ID and files. | Uploads sequentially and appends IDs; newly uploaded files are deleted if any upload or row update fails. Returns updated section or `false`. |
| `replaceImage(rowId, file)` | Section ID and one image file. | Replaces all images with the uploaded one, then deletes previous files. |
| `removeImage(rowId, fileId)` | Section ID and file ID. | Removes ID from row, then deletes file if row update succeeded. |
| `reorderImages(rowId, orderedFileIds)` | Section ID and complete desired image ID order. | Saves image order and returns updated section or `false`. |

Section type suggestions: `hero` uses images as slides; `banner` commonly uses first image plus link/button; `featured` uses featured products; `categories` renders category tiles; `products` uses `category` and `itemsLimit`; `text` can use `content.body`; `custom` leaves content interpretation to the UI.

## 21) `review.js` — customer reviews and moderation

Constants:

- `REVIEW_STATUS`: `PENDING: 'pending'`, `APPROVED: 'approved'`, `REJECTED: 'rejected'`.
- `REQUIRE_PURCHASE_TO_REVIEW` is currently `false`. If enabled, only users whose cart's `purchasedProductIds` contains the product may submit.
- `MAX_REVIEW_IMAGES` is `3`.
- `MAX_REVIEW_IDS_STORED` is `50`; product/user `reviewIds` are only bounded shortcuts, not the canonical review records.

New reviews are pending and owner-readable. Approval adds public read permission and updates product aggregates. Editing a review returns it to pending/owner-only until approved again.

### Customer operations

| Method | Input | Result and behavior |
|---|---|---|
| `canReview({ userId, productId })` | User and product IDs. | `{ allowed, reason, purchased, existing }`; `reason` is `null`, `already_reviewed`, `purchase_required`, or `error`. Reads prior review and cart purchase history. |
| `createReview({ profile, product, rating, title = '', message, files = [], orderId = null })` | Logged-in profile, product row, 1–5 rating, text, optional title/photos/order ID. | Validates account/product/rating/message and duplicate/purchase rules; uploads at most three images; creates pending review, snapshots product/user details, records verified purchase, and updates the user's recent review IDs. Returns review or `false`; inspect `lastError`. Uploaded files are rolled back if creation fails. |
| `updateMyReview({ review, rating, title, message })` | Review row plus any fields to change. | Updates supplied fields, revalidates text/rating, changes status to pending and resets owner-only permissions. Existing photos are unchanged. Returns updated row or `false`; inspect `lastError`. |
| `deleteMyReview(review)` | Own review row. | Deletes review, its image files, and the ID from the user's recent list. Product aggregates are not recalculated here; use admin recalculation or live summary as needed. Returns `true`/`false`. |
| `getMyReviewForProduct({ userId, productId })` | User and product IDs. | First matching review of any status or `false`. |
| `getMyReviews({ userId, limit = 25, offset = 0 })` | User ID and pagination. | Delegates to the review page query for that user; `{ rows, total }`. |

`createReview` rounds the numeric rating to the nearest integer and accepts only 1–5. Message is trimmed and must be 5–2000 characters; title is trimmed and capped at 150. A unique-index conflict is reported as an already-reviewed message via `lastError`.

### Public product review data

| Method | Input | Result and behavior |
|---|---|---|
| `getProductReviews({ productId, sortBy = 'newest', rating, limit = 10, offset = 0 })` | Product ID, optional rating filter, sort, pagination. | Approved reviews only; returns `{ rows, total }`. `sortBy`: `newest`, `oldest`, `highest`, `lowest`. |
| `getRatingSummary(productId)` | Product ID. | Live aggregate `{ average, total, counts }`, where counts has buckets 1–5 and average is rounded to one decimal. Errors return all-zero summary. |

### Admin moderation

| Method | Input | Result and behavior |
|---|---|---|
| `getReview(rowId)` | Review row ID. | Review row or `false`. |
| `getReviewsPage({ limit = 25, offset = 0, ...filters } = {})` | Pagination and exact filters such as status/productId/userId/rating. | Newest-first `{ rows, total }`; errors yield empty result. Use `{ status: 'pending' }` for moderation queue. |
| `countReviews(filters = {})` | Same exact filters. | Matching total. |
| `approveReview(rowId)` | Review ID. | Sets approved/public-read permissions and recalculates associated product count, average, and recent review IDs. Returns updated review or `false`. |
| `rejectReview(rowId)` | Review ID. | Sets rejected/owner-only permissions and recalculates product aggregates. Returns updated review or `false`. |
| `replyToReview(rowId, text)` | Review ID and reply text. | Saves trimmed reply capped at 1000 characters and sets `repliedAt` when the original `text` argument is truthy (otherwise clears it). Returns updated row or `false`. |
| `deleteReview(rowId)` | Review ID. | Deletes row, images, user shortcut ID, and recalculates product aggregate. Returns `true`/`false`. |
| `recalculateProduct(productId)` | Product row ID. | Recounts approved reviews and writes `reviewCount`, one-decimal `ratingAverage`, and newest 50 approved review IDs to product. Returns updated product or `false`. |
| `syncAllProducts()` | None. | Finds distinct product IDs with reviews and recalculates each sequentially; returns number of product IDs processed or `false`. |
| `deleteReviewsForProduct(productId)` | Product ID, typically before/after deleting product. | Deletes all matching reviews and their images, removes user shortcut IDs, and returns number deleted or `false`. |

### Review images

| Method | Input | Result and behavior |
|---|---|---|
| `deleteImage(fileId)` | Storage file ID. | Deletes file and returns `true`/`false`. |
| `getImageUrl(fileId)` | Storage file ID. | Synchronous file-view URL or `null`. |
| `getImageUrls(review)` | Review row. | Ordered array of non-null URLs for `imageIds`. |

## 22) Implementation notes and workflow examples

### Sign up and profile lifecycle

```js
const profile = await authService.signUp({ email, password, name });
if (!profile) {
  showError(authService.lastError);
} else {
  // profile includes $id, username, role, cartId, wishlistId, etc.
}
```

The profile lifecycle is `Auth account -> User profile -> Cart + Wishlist`. Cart and wishlist creation is best-effort; their `getOrCreate...` methods provide recovery for older or partially initialized accounts.

### Add to cart and place an order

```js
await cartService.addItem({
  profile,
  productId: product.$id,
  quantity: 2,
  variant: 'Medium',
});

const result = await cartService.getCartWithProducts({ userId: profile.$id });
const order = await orderService.placeOrder({
  profile,
  items: result.lines.map(({ productId, quantity, variant, product }) => ({
    productId,
    quantity,
    variant,
    name: product.name,
    price: product.price,
    fileId: product.imageIds?.[0] || null,
  })),
  form: { customerPhone, city, address, paymentMethod: 'cod' },
});
```

Order creation itself does not reserve stock immediately: stock changes when the order transitions from `pending` to a stock-taking status such as `confirmed`. Cancelling/returning a stock-taking order restores stock.

### Homepage rendering

```js
const sections = await layoutService.getHomepageSections();
// Each section already contains parsed `content` and `imageUrls`.
```

`getHomepageSections()` returns active sections only. Admin screens should use `getLayout()` to include inactive sections and update/reorder them with row IDs (`$id`).

### Moderation and public product rating

```js
const pending = await reviewService.getReviewsPage({ status: 'pending' });
const approved = await reviewService.approveReview(pending.rows[0].$id);
const summary = await reviewService.getRatingSummary(product.$id);
```

Approval is the point at which a review becomes publicly readable and product rating aggregates are refreshed. `getRatingSummary()` computes from approved review rows directly, while product aggregate columns are maintained for convenient product-list rendering.