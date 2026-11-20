# Task for Copilot: Art headers, `/p/` routing, and a correct 404

You can read and edit this whole project. Read the files named below before changing anything. Stack: React, react-router (v7, `import { Link } from 'react-router'`), Tailwind, lucide-react, Redux slices, deployed on **Vercel**.

Do the work in the order of the three parts below. Keep every existing behaviour (refresh button, "Updated x ago", Edit profile, notices) working.

---

## Part 1: SVG art in page headers

### 1.1 What exists in `src/ui/art/`
- `ArtFrame.jsx`: the wrapper every art uses. Props: `label`, `css`, `className`, `decorative`. Read it first and follow its conventions (viewBox, `ar-float`, `ar-twinkle`, `ar-box` classes, theme classes like `fill-accent`, `stroke-text`).
- Existing arts exported from `src/ui/art/index.js`: `OverviewArt, ProductsArt, OrdersArt, SettingsArt, CartArt, WishlistArt, CheckoutArt, FinanceArt, AlertsArt, ProfileArt, ReviewsArt, BlockedArt, NotFoundArt, NoResultsArt, PageArt (+ PAGE_ART_SIZES), EmptyState, NoSearchResults`.
- **New files I am adding** (copy into `src/ui/art/`, they follow the same style as `OverviewArt.jsx`):
  - `NoProductsArt.jsx`: empty box + magnifier, for "no product found".
  - `OrderFormArt.jsx`: clipboard order form, for the checkout/order form page.
  - `OrderSuccessArt.jsx`: parcel with tick + van, for the order placed/confirmation state.

Add these to `src/ui/art/index.js`:

```js
export { default as NoProductsArt } from "./NoProductsArt";
export { default as OrderFormArt } from "./OrderFormArt";
export { default as OrderSuccessArt } from "./OrderSuccessArt";
```

Then open `PageArt.jsx` and `EmptyState.jsx` and register the three new arts there (same way the others are mapped, add sizes in `PAGE_ART_SIZES`). If `ArtFrame` uses a different viewBox than `0 0 420 300`, adjust the three new files to match.

### 1.2 Create one reusable header: `src/ui/custom/PageHeader.jsx`
Replace the current header block in **every page** of both panels (see 1.4). Props:

```
PageHeader({ art, title, subtitle, actions, className })
```
- `art`: an art key or component (e.g. `"overview"`, `"profile"`) rendered through `PageArt` with `decorative` true.
- `title`, `subtitle`: text. Keep `font-display` title styling.
- `actions`: a React node on the right. It holds the existing buttons (Refresh, the "Updated 4m ago" indicator, Edit profile, Add product, etc.).
- Layout: a card-like section with the art on one side (hidden or smaller on mobile, `hidden sm:block`, max about `h-28 lg:h-36`), title and subtitle in the middle, and actions at the end. On mobile stack vertically, actions wrap.

### 1.3 Header styling rules (important)
- **Remove the icons** from the headers: delete the `PanelPageTitle icon="..."` usage and any lucide icon beside the title. The SVG art replaces them. Keep the buttons' own small icons (e.g. the Refresh icon) only if they are part of a button.
- **Remove the old header styling**: no gradient (`linear-gradient(120deg, var(--brown), var(--accent))`), no `text-white`, no decorative circles, no `animate-ring`, no hover-scale on the header.
- Header background: **the same as the page background but slightly lighter**. Use the theme tokens, not hardcoded colours. Example: `bg-surface` if `--surface` is lighter than `--bg` in both light and dark themes; if not, use `bg-[color-mix(in_srgb,var(--bg)_92%,white)]` and verify it in dark mode too. Add `border border-border rounded-2xl p-4 sm:p-6`.
- Text colours become `text-text` and `text-muted` (not white).
- Check light and dark theme and make sure contrast is fine.

### 1.4 Which art goes where
| Page | Art |
|---|---|
| Admin Overview (`Overview.jsx`) | `OverviewArt` |
| Admin Products | `ProductsArt` |
| Admin Orders | `OrdersArt` |
| Admin Finance | `FinanceArt` |
| Admin Alerts | `AlertsArt` |
| Admin Reviews | `ReviewsArt` |
| Admin Cart & Wishlist | `CartArt` |
| Admin Settings / User Settings | `SettingsArt` |
| User Profile (`Profile.jsx`) | `ProfileArt` |
| User Cart | `CartArt` |
| User Wishlist | `WishlistArt` |
| User Checkout / order form | `OrderFormArt` (header) |
| Order placed / confirmation screen | `OrderSuccessArt` |
| Blocked account screen | `BlockedArt` |

For `Overview.jsx`: the big "Needs attention" gradient section is a separate block. Keep its logic (Typewriter, attention chips) but restyle it with the same neutral background rules as above, and use `PageHeader` for the top header only.

For `Profile.jsx`: keep the hero (avatar, upload/remove, Typewriter, Edit profile) but apply the same neutral background rules (no gradient, text uses `text-text`), and use `PageHeader` for the page header with `ProfileArt`. The Refresh button and "Updated ... ago" indicator move into `actions`.

### 1.5 Empty states
- Products list with zero products, or a product search with zero matches: show `NoProductsArt` through `EmptyState` with title "No products found" and a hint ("Try a different search or clear the filters") plus a "Clear filters" button when filters are active.
- Other searches keep `NoSearchResults` / `NoResultsArt`.
- Orders: empty orders list uses `OrdersArt` in `EmptyState`.

### 1.6 Order form
In the checkout/order form page, show `OrderFormArt` in the header. After a successful order, show `OrderSuccessArt` with the order number, a "View my orders" link, and a "Continue shopping" link. Do not change validation or the payment logic.

### 1.7 How to use the arts (reference for anything you add)
```jsx
import { NoProductsArt } from '../../ui/art';

<NoProductsArt className="mx-auto w-full max-w-xs" decorative />   // decorative: hidden from screen readers
<NoProductsArt className="w-56" />                                  // meaningful: has an aria-label
```
Always give a width through `className`; the SVG scales to it. Use `decorative` whenever the title text next to it already says the same thing.

---

## Part 2: Routes must be `/p/pageName`

Currently pages are served at `/pageName`. Change **user-facing and admin pages** to live under `/p/`:

1. Open `src/router/path.js` (the `PATHS` object) and the router file (`createBrowserRouter` / `<Routes>`). Prefix the page routes: `/orders` becomes `/p/orders`, `/profile` becomes `/p/profile`, and so on. For admin paths that include the username (`/team/:username/...`), put it under `/p/` in the same way (e.g. `/p/team/:username/orders`), or tell me first if you think that is wrong.
2. **Do not hardcode URLs anywhere.** Every `Link`, `navigate()`, `NavLink`, sidebar item and redirect must use `PATHS`. Search the whole project (`grep -rn "to=\"/"`, `navigate('/`, `href="/`) and fix every hit. Also check the post-login redirect, the logout redirect, the Google OAuth success/failure redirect URLs, and email links.
3. Keep the home page `/` and auth pages (`/login`, `/signup`) as they are unless they are clearly "pages" in the same sense. Tell me what you decided.
4. Add **redirects from old URLs** to new ones so bookmarks keep working: e.g. `{ path: '/orders', element: <Navigate to="/p/orders" replace /> }`. Do it generically with a small list.
5. Active-state highlighting in the sidebar and tabs must work with the new prefix (check `NavLink` `end` props).

## Part 3: A correct 404 and error handling

1. Add a catch-all route as the **last** route: `{ path: '*', element: <NotFound /> }`. Also handle `/p/*` unknown pages with the same component.
2. `NotFound` page: uses `NotFoundArt` through `PageArt`, title "Page not found", short text, and two buttons: "Go back" (`navigate(-1)`) and "Go home" (a role-aware link: admin goes to the admin overview, user to their profile or the shop, guest to `/`). Set the document title ("404 | Page not found").
3. Add an `errorElement` on the root route for thrown loader/render errors: use `useRouteError()`; show a friendly error page (reuse the art, no stack trace in production), with a "Reload" button. A 404 `Response` thrown from a loader should render the same `NotFound`.
4. Role guards: if a user opens an admin URL, or an admin opens a user URL, or the username in the URL does not match the signed-in user, show `NotFound` (or redirect to their own home), never a blank page or another person's data. Blocked users go to the `BlockedArt` screen.
5. **Vercel**: a single-page app needs a rewrite or a direct refresh on `/p/orders` returns Vercel's own 404. Create or update `vercel.json` in the project root:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
Make sure static assets and `/api` routes (if any) still work. Confirm the build output folder is right for the bundler (Vite: `dist`).
6. If the app uses a `basename` or `<base>` tag, keep it consistent with the new prefix.

---

## Definition of done
- [ ] Every page in both panels uses `PageHeader` with the correct art; no icon beside the titles; no gradient headers; background equals the page background but a bit lighter, in light and dark mode.
- [ ] Header buttons (refresh, edit, add, etc.) all still work and look right on mobile.
- [ ] `NoProductsArt`, `OrderFormArt`, `OrderSuccessArt` are exported and used where listed.
- [ ] All routes are `/p/...`; old URLs redirect; no hardcoded old paths remain (show me the grep result).
- [ ] Unknown URLs show the 404 page, refreshing any `/p/...` page on Vercel works, role guards behave.
- [ ] `npm run build` passes with no new warnings, and there are no unused imports left (e.g. icons removed from headers).
- Finish with a short summary of the files you changed and any decisions you made.