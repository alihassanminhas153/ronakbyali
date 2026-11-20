# Prompt for GitHub Copilot: Sales, Custom orders, Alerts by page, Form redesign

Paste everything below the line into Copilot Chat (Agent mode). Do it in **one part at a time**: paste the "Rules for you" section plus a single Part, wait until it finishes, run the app, then paste the next Part.

---

## Rules for you (Copilot), read these first

You are working inside an existing React + Vite + Redux Toolkit + Tailwind project backed by Appwrite. The project folder is `website/`. The structure is in `extras/websiteFileStructure.txt`. Follow these rules in every part:

1. **Read before you write.** Before editing any file, open it and read it fully. Never guess what a file contains. Files you must read before starting: `src/lib/appwrite/product.js`, `alert.js`, `order.js`, `tracker.js`, `index.js`, `src/store/slices/productsSlice.js`, `alertSlice.js`, `ordersSlice.js`, `services.js`, `utils.js`, `uiSlice.js`, `src/components/admin/products/*`, `alerts/*`, `orders/*`, `src/components/shop/ProductCard.jsx`, `src/pages/shared/products/Product.jsx`, `src/pages/admin/dashboard/Products.jsx`, `src/components/shared/AlertPopupHost.jsx`, `src/components/shared/header/AlertBell.jsx`, `useHeaderData.js`, and `src/ui/custom/**` (inputs, modal, buttons).
2. **Copy the existing style.** New services copy `product.js` (class, `try/catch`, returns `false` on error, `console.error(error.message)`). New slices copy `productsSlice.js` (`createAsyncThunk`, `createEntityAdapter`, `adminThunk` helper pattern, selectors at the bottom). Do not invent a new pattern.
3. **Reuse the existing UI components.** Use `Modal` with `variant="drawer"` for every form (it slides in from the right), `TextInput`, `SelectInput`, `SwitchField`, `DatePicker`, `ImageUploader`, `ActionButton`, `ConfirmDialog`, `Tabs`, and toasts through `uiSlice`. Do not create new colors or fonts; use the Tailwind tokens already used (`bg-surface`, `text-muted`, `border-border`, `text-accent`, `text-error`, `shadow-soft`). Read `extras/THEME.md` and `extras/DESIGN.md`.
4. **No new admin page.** Everything is a button or drawer inside the existing admin pages. Do not add routes or sidebar items.
5. **Do not change Appwrite table structure in code.** The tables and columns are created by the owner using `appwrite.config.json`. Column names are exactly as listed in each part.
6. **Do not change existing behavior** that is not mentioned. If a change would break something else, stop and tell me.
7. **Accessibility and mobile.** Every icon-only button needs an `aria-label`. Layouts must work from 360px wide. Respect `motion-reduce`.
8. **After each part**, list the files you created and edited, and anything you were unsure about.

### Columns you can rely on (already created in Appwrite)

- `ronakbyali_sales`: `name` (string), `startsAt` (datetime), `endsAt` (datetime), `discountPercentage` (number 0-100), `makeAlert` (boolean), `type` (`info|success|warning|error|promo`), `alertId` (string).
- `ronakbyali_products` new: `saleId` (string), `isCustom` (boolean), `customDetails` (text), `customFileId` (string, bucket file id).
- `ronakbyali_orders` new: `isCustom` (boolean), `customDetails` (text), `customFileId` (string).
- `ronakbyali_alerts` new: `pages` (array of `all|home|products|product`), `saleId` (string).
- Tracker table new: `detail` (text).

---

## Part 1: Sales (service, slice, env)

**Goal:** the data layer for sales. No UI yet.

1. In `env/var.js` add `ronakByAliSales: String(import.meta.env.RONAK_BY_ALI_SALES_TABLE_ID),` in the same style as the others. (The `.env` already has the value.)
2. Create `src/lib/appwrite/sale.js` exporting a `SaleService` class and a default `saleService` instance, modelled on `product.js`. Methods (each returns the row/rows or `false` on failure):
   - `addSale(data)`, `updateSale(rowId, data)`, `deleteSale(rowId)`, `getSale(rowId)`
   - `getSales()`: all sales, newest first, paged with the same `_listAllRows` approach as `product.js`.
   - Validation inside `addSale`/`updateSale`: `endsAt` must be after `startsAt`, `discountPercentage` between 0 and 100, otherwise return `false` and set `this.lastError` to a readable message.
3. Export `saleService` from `src/lib/appwrite/index.js` and `src/store/slices/services.js` the same way the others are exported.
4. Create `src/lib/saleMath.js` (pure functions, no imports from Appwrite):
   - `getSaleStatus(sale, now = new Date())` returns `'upcoming' | 'active' | 'ended'`.
   - `getEffectivePricing(product, sales, now = new Date())` returns `{ price, originalPrice, discountPercentage, discountName, sale }`. Logic: find the sale whose id equals `product.saleId`; if it is `active`, use `Math.round(originalPrice * (1 - pct / 100))` and its name and percentage; otherwise fall back to the product's own stored `discountPercentage` / `price`.
5. Create `src/store/slices/saleSlice.js` modelled on `productsSlice.js`: entity adapter, `fetchSales`, admin thunks `addSale`, `updateSale`, `deleteSale`, selectors `selectSalesList`, `selectSaleById(id)`, `selectSaleOptions` (array of `{ value: id, label: "Name (20%)" }` for `SelectInput`), `selectActiveSales`. Register the reducer in `src/store/store.js`.

**Done when:** the app still builds, and in the browser console you can dispatch `fetchSales()` without errors.

---

## Part 2: Sales manager drawer inside the admin Products page

**Goal:** a **Sales** button on the admin Products page that opens a right-side drawer to create, edit and delete sales. No new page.

1. In `src/pages/admin/dashboard/Products.jsx`, add a secondary `ActionButton` labelled **Sales** next to the existing add-product button. On click it opens the drawer.
2. Create `src/components/admin/products/SalesDrawer.jsx` using `Modal variant="drawer"`. Inside: a list of existing sales (name, date range, discount %, a status badge from `getSaleStatus`, edit and delete buttons) and an **Add sale** button that switches the drawer body to the form.
3. Create `src/components/admin/products/SaleForm.jsx` with these fields, in order: Name (`TextInput`), Starts (`DatePicker` with time if it supports it), Ends (`DatePicker`), Discount % (`TextInput` type number, suffix `%`), Create alert automatically (`SwitchField` bound to `makeAlert`), Alert type (`SelectInput`, only visible when `makeAlert` is on, options `info`, `success`, `warning`, `error`, `promo`, default `promo`). Validate: name required, end after start, discount 1-100. Show errors the same way other forms do.
4. Delete uses `ConfirmDialog` with `danger`. Deleting a sale must also clear `saleId`, `discountName` and `discountPercentage` on every product that used it (query products with that `saleId`, update them in chunks of 10), and delete its linked alert (see Part 3).
5. Toasts: "Sale created", "Sale updated", "Sale deleted", using the same toast dispatch the other pages use.

**Done when:** you can create, edit and delete a sale from the Products page and see it in the Appwrite console.

---

## Part 3: Sale creates its alert automatically

**Goal:** when `makeAlert` is true, an alert exists for the sale and stays in sync.

Add a function `syncSaleAlert(sale)` (put it in `src/lib/appwrite/sale.js` or a small `saleAlerts.js` next to it, using the existing `alertService`):

- If `makeAlert` is true and the sale has no `alertId`: create an alert with `title` = sale name, `message` = `"{discountPercentage}% off on selected products. Valid until {endsAt formatted}."`, `type` = the sale's `type`, `status` = `'active'`, `popup` = `false`, `startsAt`/`endsAt` = the sale's dates, `pages` = `['products', 'product']`, `saleId` = the sale id. Save the new alert id into the sale's `alertId`.
- If `makeAlert` is true and `alertId` exists: update that alert's title, message, type, dates.
- If `makeAlert` is false and `alertId` exists: delete the alert and set the sale's `alertId` to `null`.
- Call `syncSaleAlert` after every successful `addSale` / `updateSale`. If creating the alert fails, keep the sale and show a warning toast ("Sale saved, but the alert could not be created").

**Done when:** creating a sale with the switch on produces an alert visible in the admin Alerts page and linked back through `alertId`.

---

## Part 4: Pick a sale when adding or editing a product

**Goal:** the product form has a Sale selector, and the sale shows everywhere the product shows.

1. In `ProductForm.jsx` (and `productFields.js` / `productSchema.js`) add a **Sale** field using `SelectInput` with `clearable`, options from `selectSaleOptions` (only `active` and `upcoming` sales, plus the currently selected one even if ended). Fetch sales when the form opens.
2. When a sale is chosen set `saleId`, `discountName` = sale name and `discountPercentage` = sale percentage, then recompute `price` the same way `productService.prepareProductData` does. When cleared, set `saleId` to `null`, `discountName` to `null`, `discountPercentage` to `0`, and `price` back to `originalPrice`. Show a small read-only hint under the field: "Price after sale: Rs X".
3. Everywhere a price is displayed or used, call `getEffectivePricing(product, sales)` instead of reading `product.price` directly. Search the whole `src` folder for `.price`, `priceFormat` and `discountPercentage` and update: `ProductCard.jsx`, `Product.jsx`, cart, wishlist, checkout (`orderMath.js`, `CheckoutPage.jsx`, `ProductCheckoutDrawer.jsx`), and the admin `ProductTable`. This is the part that makes an ended sale stop applying automatically. Make sure `sales` are loaded by the storefront pages (dispatch `fetchSales` once where products are fetched).
4. In `ProductTable.jsx` add a **Sale** column showing the sale name with the status badge, or a dash.
5. In `ProductCard.jsx` and `Product.jsx` show the sale name as a small badge when the sale is active (reuse the existing discount badge style).

**Done when:** selecting a sale on a product shows it in the table and storefront, and changing the sale's end date to the past removes the discount on the storefront without editing the product.

---

## Part 5: Custom products ("Customize")

**Goal:** products can be marked customizable; customers get a **Customize** button that opens a drawer form like the order form.

**Admin side**
1. In `ProductForm.jsx` add: a `SwitchField` **Customizable** (`isCustom`), and, only when it is on, a textarea **Custom details** (`customDetails`, instructions shown to the customer, `showCount`, max 1000) and an `ImageUploader` **Sample image** that uploads to the bucket and stores the file id in `customFileId` (reuse `productService.uploadImage` / `deleteImage`; delete the old file when replaced).
2. In `ProductTable.jsx` add a **Custom** column showing a small badge when `isCustom` is true.

**Customer side**
3. In `ProductCard.jsx` and `Product.jsx` show a **Customize** button **only when `product.isCustom === true`**. Place it next to Add to cart. It must never render for other products.
4. Create `src/components/shop/CustomOrderDrawer.jsx` using `Modal variant="drawer"`. Look at `ProductCheckoutDrawer.jsx` and copy its structure and fields (name, phone, city, address, payment method, delivery type, notes). Add: the product's `customDetails` shown as read-only guidance at the top, a **Your customization** textarea (required, max 1000) saved as `customDetails`, and an `ImageUploader` **Reference image** (optional) saved as `customFileId`. Require the user to be logged in, using the same redirect/guard the checkout uses.
5. Submitting creates an order through the existing order flow with `isCustom: true`, `customDetails`, `customFileId`, and the product as the only item. Reuse the same price math as normal checkout. Order status starts as `pending`.
6. In the admin `OrderTable.jsx` / `OrderForm.jsx` show a **Custom** badge on custom orders, show the customization text, and show the reference image as a thumbnail that opens full size (use the bucket view URL).
7. Upload the reference image only after the form validates, and delete it if creating the order fails.

**Done when:** a product with Customizable on shows the button, the drawer creates a custom order, and the admin sees the text and image on that order.

---

## Part 6: Alerts only on chosen pages

**Goal:** an alert can be limited to the Products page, a single product page, home, or everywhere.

1. In `AlertForm.jsx`, `alertSchema.js` and `alertMeta.js` add a **Show on pages** field bound to `pages` (array). Build it as a row of toggle chips (Everywhere, Home, Products list, Product page) using existing button/chip styles. Choosing "Everywhere" clears the others. Saving with nothing selected stores an empty array, which means everywhere (so existing alerts keep working).
2. Create a hook `src/components/shared/usePageAlerts.js` that returns the alerts whose `pages` is empty, contains `'all'`, or contains the current page key. Page key comes from the route: `/` → `home`, `/products` → `products`, `/products/:slug` → `product`, anything else → `other` (only "everywhere" alerts show there).
3. Use that hook in `AlertPopupHost.jsx` (popups), `AlertBell.jsx` / `useHeaderData.js` (the list), and anywhere else the app picks alerts to show. Keep existing rules (status active, date window, seen/dismissed logic).
4. In `AlertTable.jsx` add a **Pages** column showing short chips for the selected pages.

**Done when:** an alert set to "Products list" shows on `/products` and nowhere else; an alert with no pages still shows everywhere.

---

## Part 7: Replace label-style pickers with SelectInput

**Goal:** wherever a form lets you choose one value from several options using buttons or label chips, use `SelectInput` instead.

1. **Alert form:** `type` and `status` become `SelectInput`. Options from `alertMeta.js`, labelled in plain words (e.g. "Promo", "Active").
2. **Order form:** `status`, `paymentStatus`, `paymentMethod`, `deliveryType` become `SelectInput` (options from `orderMeta.js`).
3. **Order confirmation:** add a `SelectInput` **Confirmation** with options "Confirmed" (`true`) and "Not confirmed" (`false`) that reads and writes the boolean `isConfirmed`. When it changes to confirmed also set `confirmedAt` to now; when changed to not confirmed set `confirmedAt` to `null`. Keep using the existing order service methods that already handle stock on confirm/cancel; do not duplicate that logic.
4. Keep `size="md"` in forms. Keep error and hint props working. Do not change filters in toolbars (those already use `size="sm"`).
5. Search the other admin forms (products, users, reviews, finance) for the same pattern and convert them too, but list each file you changed.

**Done when:** no form in the admin panel uses button-style pickers for single-choice fields.

---

## Part 8: Order detail message saved to the tracker

**Goal:** in the admin order form, an input where the admin types a message; on submit it is saved in the tracker table and shown as the order's detail for the customer.

1. Open `tracker.js` and `OrderTracker.jsx` first and understand how `updates` and `updateLink` are used today.
2. In the admin order drawer (`OrderForm.jsx` or `OrderTracker.jsx`, whichever already edits the tracker) add a `TextInput` **Order detail** with a **Post update** button beside it. Max 300 characters, show the counter, disable the button while empty or saving.
3. On submit: push a new entry onto the tracker row's `updates` array **in the same format the existing entries use** (if there is none, use a JSON string `{"text":"...","at":"<ISO date>"}`), and set the tracker's `detail` to the same text. Create the tracker row first if the order has none (the existing tracker service probably has a helper for this). Clear the input and show a toast "Update posted".
4. Show the latest `detail` in the admin order table row (truncated, with a tooltip for the full text) and the full list of `updates`, newest first, inside the order details for both the admin and the customer (`pages/user/dashboard/Orders.jsx`).
5. Admins may delete the latest update with a `ConfirmDialog`. When they do, `detail` becomes the previous update's text or `null`.

**Done when:** posting an update in the admin order form shows it immediately for the customer under that order.

---

## Part 9: Cart icon on small screens

**Goal:** on phones the Add to cart button shows only the cart icon.

1. In `ProductCard.jsx` and `Product.jsx` change the Add to cart button so the text is wrapped in `<span className="hidden sm:inline">Add to cart</span>` and the cart icon always shows. Give the button `aria-label="Add to cart"` and a minimum touch size of `size-11` below `sm`.
2. If the product also has a **Customize** button (Part 5), keep both on one row on mobile: the icon button and the Customize button share the width; nothing should wrap or overflow at 360px.
3. Keep the existing loading, success and disabled (out of stock) states.

**Done when:** at 360px wide the card shows an icon-only cart button and nothing overflows.

---

## Final check (paste last)

Run `npm run lint` and `npm run build` and fix every error you introduced. Then give me a manual test list covering: create a sale with alert, attach it to a product, let it end (edit the date), customize order, alert on Products page only, post an order update, and the mobile cart button.