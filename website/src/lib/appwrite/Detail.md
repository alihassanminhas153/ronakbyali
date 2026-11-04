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