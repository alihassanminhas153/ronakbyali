# Task for Copilot: Custom (customizable) products, end to end

You can read and edit the whole project. Read these first and follow their conventions exactly: `src/lib/appwrite/product.js`, `order.js`, `tracker.js`, `user.js`, `src/lib/checkoutDraft.js`, `src/lib/orderMath.js`, `src/store/slices/productsSlice.js`, `ordersSlice.js`, `cartSlice.js`, the admin Products page and its product form/drawer, the checkout page, the admin Orders page, and `extras/APPWRITE TABLES.md`. Stack: React, react-router, Tailwind, lucide-react, Redux Toolkit, Appwrite (`TablesDB`), Vercel.

**Hard rules**
- Do not change the behaviour of anything that already works (normal products, cart, normal checkout, existing tables). Add alongside it.
- Services return `false` on failure and put a plain message in `lastError`; slices use `fail(rejectWithValue, msg, arg)` and `stripToast`. Do the same.
- Never hardcode URLs; use `PATHS`. Routes live under `/p/...` (see the earlier routing prompt).
- Show art in empty states and headers with the `src/ui/art` components (`OrderFormArt`, `NoProductsArt`, `OrderSuccessArt`).
- Prices are numbers in PKR; format with the existing helpers.

---

## 1. Data model (Appwrite)

I am pushing `appwrite_custom_tables.json` (a merge fragment) to Appwrite. It contains:

**New table `ronakbyali_custom_orders`** (one row per customization request; row id = new `ID.unique()`, but `orderId` is unique). Columns: `orderId, orderNumber, userId, customerName, customerPhone, productId, productName, quantity, selections (JSON text), customerNote, referenceFileIds (string[]), quotedTotal, status (requested | contacted | confirmed | in_progress | ready | cancelled), contactMethod (whatsapp | call | email | other), contactedAt, adminNotes, isCustom (default true)`.

**New table `ronakbyali_order_confirmations`** (one row when an order is confirmed, for normal AND custom orders). Columns: `orderId (unique), orderNumber, userId, isCustom, total, advanceAmount, contactMethod, paymentProtocol, confirmedBy, confirmedAt, notes`.

**Columns on existing tables** (only if missing; `extras/APPWRITE TABLES.md` says some already exist):
- `ronakbyali_products`: `isCustom`, `customDetails`, `customFileId`, **`customOptions`** (JSON text `[{ id, label, price }]`, the list of things that can be customized, each with its own price).
- `ronakbyali_orders`: `isCustom`, `customDetails`, `customFileId`, **`customSelections`** (JSON text of the options the customer chose, with prices), **`customFileIds`** (string[] reference images).

Add the env var for the new table ids next to the existing ones in `env/var` (`ronakByAliCustomOrders`, `ronakByAliOrderConfirmations`) and to `.env` / the Vercel env list in the README.

If a column from the list already exists, reuse it. Do not create duplicates.

## 2. New services

### `src/lib/appwrite/customOrder.js` (class `CustomOrderService`, same style as `order.js`)
- `lastError`, `_fail`.
- `parseOptions(product)`: `customOptions` as an array (safe JSON parse, `[]` on error).
- `parseSelections(order)`: same for `customSelections`.
- `priceSelection(product, selectedIds, quantity, sales)`: **the single source of truth for price.** unit = effective product price (use `getEffectivePricing(product, sales).price`, same as checkout) + sum of the chosen options' prices **looked up from the product's own `customOptions`** (never trust a price sent from the browser). Returns `{ unit, optionsTotal, subtotal, selections: [{ id, label, price }] }`. Unknown option ids are an error.
- `uploadReferences(files)`: max 5 files, JPG/PNG/WebP only, max 5 MB each; run each through `optimizeImage` (same as `productService.uploadImage`); upload to the same bucket as products; return file ids. Roll back (delete) already uploaded files if a later one fails.
- `placeCustomOrder({ profile, product, quantity, selectedIds, form, files })`:
  1. validate: product `isCustom`, signed in, at least 1 option selected (if the product has options), `_checkDetails`-style validation of name, phone, city, address (reuse `orderService._checkDetails`, make it callable).
  2. compute price with `priceSelection`; delivery charges via the existing helper used in `placeDirectOrder`.
  3. upload reference images; on any failure stop and return `false` with a message.
  4. create the **order row** through `orderService` (extend `orderService.placeOrder` with an optional `custom` argument, or add `placeCustomOrderRow`): one item (`productId, name, price = unit, quantity, fileId`), `isCustom: true`, `customDetails: form.notes`, `customSelections: JSON.stringify(selections)`, `customFileIds`, `status: 'pending'`, `paymentStatus: 'unpaid'`, `paymentMethod: 'bank_transfer'` (placeholder, see section 5), `deliveryType` as chosen.
  5. create the **custom order row** in `ronakbyali_custom_orders` with status `requested`, permissions `read/update` only for staff labels (the table already grants them) plus `read(Role.user(userId))` for the customer.
  6. run the same `_afterOrder` side effects as a normal order (profile counters, tracker "Order placed", wishlist). Do not touch the cart. Failures there never undo the order.
  7. return the order row.
- Staff: `getCustomOrders({ limit, offset, status })`, `getByOrderId(orderId)`, `updateCustomOrder(rowId, patch)` (status, contactMethod, contactedAt, adminNotes, quotedTotal). Whitelist the keys.
- `getReferenceUrls(fileIds)` using the bucket's `getFileView`, same as `productService.getImageUrl`.

### `src/lib/appwrite/orderConfirmation.js`
- `createForOrder({ order, contactMethod, paymentProtocol, notes, confirmedBy })`: upserts one row per `orderId` (unique index). Copies `orderNumber, userId, isCustom, total, advanceAmount`.
- `getByOrderId(orderId)`, `list({ limit, offset, isCustom })`, `deleteForOrder(orderId)`.

### Changes in `order.js` (additive only)
- In `updateStatus`: when the new status is `confirmed`, after the normal work call `orderConfirmationService.createForOrder(...)` inside the existing `Promise.allSettled` (best effort, never blocks). For a custom order also set the matching `ronakbyali_custom_orders.status` to `confirmed`. When an order is cancelled/returned, set the custom row to `cancelled`.
- **Stock**: skip `productService.adjustStock` for items of custom products (`order.isCustom`), because custom products are made to order and have no stock.
- In `deleteOrder`: also delete the custom order row and the confirmation row.
- Customers must **not** be able to edit the items or quantities of a custom order (the price was quoted from the options), so `USER_EDITABLE` logic for `setItemQuantity` and `addItemsToOrder` must refuse when `order.isCustom` with the message "This is a customized order. Please contact us to change it." Customer may still change address and cancel before it ships.

### Redux
- `ordersSlice.js`: add `placeCustomOrder` thunk (same shape as `placeDirectOrder`: `stripToast`, `needLogin`, `fail`, refresh profile), using `customOrderService`. Reuse `placeStatus / placeError / lastPlacedOrder` and add `lastPlacedKind: 'custom'`.
- Add `selectCustomOrderForOrder(orderId)` and staff thunks `fetchStaffCustomOrders`, `updateStaffCustomOrder`, with a `staff.custom` entity adapter state like the existing staff block (kept separate). Add the usage comment block at the top of the file for the new thunks, as the file already does.
- `productsSlice.js`: nothing structural; admin thunks already pass `data` straight through, so `customOptions` travels inside `data`.
- `stockProblem` (ordersSlice): **return null for products with `isCustom`** so custom products never block as out of stock. Normal products unchanged.

## 3. Admin: "Add product" chooser

On the admin Products page, the **Add product** button must no longer open the form directly. It opens a small modal (use the existing modal components and `ConfirmDialog` styling) titled **"What do you want to add?"** with two big cards:
- **New product**: art `ProductsArt`, text "A normal product with stock", opens the existing product form unchanged.
- **Custom product**: art `OrderFormArt`, text "Made to order, customer picks the customizations", opens the new custom product form.

Esc and the close button dismiss it. Keep the same "new key remounts the form" pattern the page already uses (`{ key, open, mode: 'new' | 'custom' }`).

## 4. Admin: custom product form

Build `CustomProductForm` (reuse as many existing form pieces as possible: name, slug via `generateUniqueSlug`, description, category/group selects, images upload with `addImages`, featured, `order`). Differences from the normal form:
- Sets `isCustom: true`. **No stock fields** (`totalAvailable`, `sold`, `remaining`); write `status: 'inStock'` so it always shows as available.
- `originalPrice` is labelled **"Starting price"** (base price before any customization), with discount fields as in the normal form.
- `customDetails`: textarea "Instructions for the customer" (what to send, sizes, deadlines).
- `customFileId`: optional sample/template image upload (use the existing image upload helpers and store the file id).
- **"What can be customized" list** (stored in `customOptions`):
  - Show a row with: a text input (placeholder "e.g. Embroidery"), a price input (PKR, number, min 0), and a small **Add** button on the same row.
  - Below it a full-width, dashed, **"Add more"** button. Clicking it adds one more empty row of the same kind (name + price + Add), so the admin can add several.
  - Each committed customization appears as a removable row/chip (with an ✕ to remove and edit-in-place on click). Give each a stable `id` (`crypto.randomUUID()` or `c-${Date.now()}-${n}`).
  - Validation: at least one customization; label required, max 60 chars, no duplicates (case-insensitive); price a number >= 0, max 1,000,000; max 20 customizations. Show inline errors, no `alert()`.
  - Save as `JSON.stringify([{ id, label, price }])`. When editing an existing custom product, parse it back into rows.
- Editing a custom product opens this same form (detect `product.isCustom`). The normal form must never show for a custom product and the other way round.
- In the products table, show a **"Custom"** badge for `isCustom` rows and hide the stock column values for them ("Made to order"). Add a "Type" filter (All / Normal / Custom) that uses `Query.equal('isCustom', ...)` through the existing filter path (add `isCustom` to the services' accepted filters; default must still return both).

## 5. Storefront: customize flow

- On the product detail page and product cards, a product with `isCustom` shows a **Customize** button instead of Add to cart / Buy now (no cart for custom products). Route: `/p/customize/:slug` (via `PATHS`), loads with `fetchProductBySlug`; if the product is missing or not custom, render the 404 page.
- Page `CustomizeCheckout` (header with `OrderFormArt`, using the shared `PageHeader`). A single form, sections in this order:
  1. **Product summary**: image, name, starting price, the admin's `customDetails` instructions, and the sample image if present.
  2. **Choose customizations**: one checkbox row per option from `customOptions`: label and "+ Rs X". The customer may pick one or several. Require at least one.
  3. **Quantity**: number input (min 1, max 50).
  4. **Reference images**: file input (drag-and-drop zone, multiple, max 5, JPG/PNG/WebP, 5 MB each) with thumbnails (use `URL.createObjectURL`, revoke on cleanup), a remove button per image, and clear error messages. Also a textarea **"Describe what you want"** (max 1000 chars, shows a counter) saved to `customDetails`.
  5. **Your details**: name, phone, email (guests only), city, address; prefill with `fillFromProfile`; validate with `validateDetails`.
  6. **Delivery**: only the delivery type choices that already exist (`regular`, `fast`, `pickup`), using the same delivery-charge helper.
  7. **Payment info box (no input)**: text only: "Customized orders are paid in advance. After you place this request our team will contact you (for example on WhatsApp) to confirm the details and agree how to pay online." **There must be no payment method selector on this page.**
  8. **Price summary (live)**: starting price + each selected customization line, x quantity, delivery, total. Recompute on every change with the same maths as `customOrderService.priceSelection`. Show "Final price confirmed by our team" under the total.
  9. Submit button "Send customization request" (disabled and spinner while `placeStatus === 'loading'`).
- Guests: reuse the existing checkout guest flow (`saveDraft` / Google login / `loadDraft`) so a guest does not lose the form. Files cannot be stored in localStorage, so after login ask them to pick the images again and show a short notice saying so. Never store a password.
- On success: clear form and draft, show `OrderSuccessArt` with the order number, the message "We will contact you soon to confirm", and links "View my orders" and "Continue shopping". Use `clearLastPlacedOrder` on leaving.
- In the customer's order details page, for `isCustom` orders show: a "Customized" badge, the selected customizations with prices, their reference images, their note, and the text that the team will contact them. Hide the "add more items" and quantity controls (see section 2).

## 6. Admin Orders: custom orders and confirmation

- Orders list: a **"Custom"** badge on `isCustom` rows and an "All / Normal / Custom" filter.
- Order details (admin) for a custom order: customizations with prices, the customer's note, reference images (clickable to enlarge), and a **Custom request** panel: status select (requested, contacted, confirmed, in_progress, ready, cancelled), contact method select (WhatsApp, call, email, other), "Contacted" button (sets `contactedAt` and status `contacted`), quoted total input, and admin notes. A **"Open WhatsApp"** link built as `https://wa.me/<digits of customerPhone>` (strip non-digits; if the number starts with `0` and the shop is in Pakistan, replace with `92`; confirm the country code logic with the existing phone helpers before assuming).
- When staff set the order status to **confirmed**, open a small dialog asking for `contactMethod`, `paymentProtocol` ("how will the advance be paid", free text) and `notes` (all optional), then call `updateOrderStatus` and write the order confirmation row. The same dialog appears for normal orders (it is just optional there), so both normal and custom confirmed orders have a record in `ronakbyali_order_confirmations`.
- Add a **Confirmed orders** view (a tab or filter on Orders, or a section of the admin Orders page) listing rows from `ronakbyali_order_confirmations` with a Custom badge, order number, customer, total, contact method, confirmed date.
- Empty states: use `EmptyState` with `OrdersArt` / `NoProductsArt`.

## 7. Safety and quality

- Validate everything on the client **and** in the service. Prices always come from the product row, never from the form.
- Uploads: check MIME type and size before uploading; delete uploaded files if the order creation fails afterwards.
- Do not log personal data. Errors shown to users are plain sentences.
- Accessibility: labels on every input, `aria-describedby` for errors, focus moves to the first error on submit, keyboard-operable file zone and checkboxes, `role="dialog"` with focus trap on the chooser and confirm dialogs.
- Responsive: forms single column on mobile; the customization row stacks (input, price, Add) under 480 px.
- Performance: revoke object URLs, lazy-load images, no refetch loops.
- Appwrite permissions: confirm the customer can create files in the bucket and can create rows in `ronakbyali_custom_orders` (table has `create("users")`). If the bucket does not allow user uploads, tell me exactly which bucket permission to add; do not weaken existing permissions.
- Do not edit `appwrite.config.json` except to merge in `appwrite_custom_tables.json` (new tables and the missing columns only). Show me the diff before finishing.

## Definition of done
- [ ] "Add product" shows the New product / Custom product chooser; both forms save correctly.
- [ ] Custom form: input + Add on one row, full-width "Add more" adds a new row; each customization has a price; saved in `customOptions`.
- [ ] Custom products show Customize (no cart), customers can pick one or several customizations, upload reference images, see a live total, and there is no payment method input.
- [ ] Placing a request creates rows in `ronakbyali_orders` (isCustom true) and `ronakbyali_custom_orders`; the tracker timeline starts.
- [ ] Confirming an order writes `ronakbyali_order_confirmations` (normal and custom); custom status follows the order status.
- [ ] Stock logic ignores custom products; customer cannot edit items of a custom order.
- [ ] Admin can filter Custom, see images/selections, contact by WhatsApp link, and view confirmed orders.
- [ ] `npm run build` passes, no unused imports, existing flows verified unchanged.
- Finish with a short list of files changed and any assumption you made.