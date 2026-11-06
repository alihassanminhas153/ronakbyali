# Codebase Brief

This document records the implementation visible in the listed project files at
the time it was written. It describes current behavior, including placeholders,
unused exports, and mismatches; it is not a proposed design.

## 1. Theme

### Source files

| Path | Purpose | Exports | Project dependencies | Real use |
|---|---|---|---|---|
| `src/THEME.md` | Describes theme token names and intended utility mappings. | None. | None. | Token names are used by components such as `src/ui/custom/button/ActionButton.jsx`. |
| `src/index.css` | Imports Tailwind, defines the theme, fonts, base styles, reusable component classes, and keyframes. | CSS rules and Tailwind theme definitions. | Tailwind CSS v4. | Imported by `src/main.jsx` with `import "./index.css";`. |
| `src/context/ThemeContext.jsx` | Stores the current light/dark theme, persists a manually selected theme, and follows system preference until a choice is saved. | `ThemeProvider`, `useTheme`. | React. | `src/main.jsx` wraps `<App />` in `<ThemeProvider>`; `ThemeToggle` calls `useTheme()`. |

`src/THEME.md` lists variables it does not completely enumerate: `--muted` is
defined in CSS as a legacy alias but missing from the document. Conversely,
the document describes `--radius-sm`, `--radius-md`, `--radius-lg`, and
`--animate-*`, which are defined in CSS within `@theme`, not as declarations in
the `:root` variable block.

### CSS variables and Tailwind theme names

Values below are the literal CSS values from `src/index.css`.

| Type | CSS custom properties | Tailwind name / mapping |
|---|---|---|
| Colors / page | `--bg: #0a0a0b` | `--color-bg: var(--bg)` → `bg-bg`, `text-bg`. |
| Surfaces | `--surface: #111113`; `--surface-alt: #18181b` | `--color-surface`, `--color-surface-alt` → `bg-surface`, `bg-surface-alt`. |
| Borders | `--border: #27272a` | `--color-border` → `border-border`. |
| Text | `--text: #ededee`; `--text-muted: #8b8b93` | `--color-text`, `--color-muted` → `text-text`, `text-muted`. |
| Brand / state colors | `--accent: #3d6df2`; `--accent-hover: #5a85f5`; `--on-accent: #ffffff`; `--success: #3fb27f`; `--warning: #e0a030`; `--error: #e5484d` | `--color-accent`, `--color-accent-hover`, `--color-on-accent`, `--color-success`, `--color-warning`, `--color-error`. |
| Legacy colors | `--page: var(--bg)`; `--glow: var(--surface)`; `--field: var(--surface)`; `--ink: var(--text)`; `--muted: var(--text-muted)`; `--line: var(--border)`; `--sage: var(--accent)`; `--sage-deep: var(--accent-hover)`; `--sage-wash: color-mix(in srgb, var(--accent) 8%, var(--bg))`; `--btn: var(--text)`; `--btn-ink: var(--bg)`; `--btn-hover: color-mix(in srgb, var(--text) 85%, var(--bg))` | `--color-page`, `--color-glow`, `--color-field`, `--color-ink`, `--color-line`, `--color-sage`, `--color-sage-deep`, `--color-sage-wash`, `--color-btn`, `--color-btn-ink`, `--color-btn-hover`; the `--muted` alias has no separate `--color-*` mapping. |
| Shadows | `--shadow: 0 1px 2px rgba(0, 0, 0, 0.5)`; `--card-shadow: rgba(0, 0, 0, 0.5)` | `--shadow-soft: var(--shadow)` → `shadow-soft`. `--card-shadow` has no Tailwind mapping in the shown CSS. |
| Fonts | `--font-display: "Barlow Condensed", "Arial Narrow", sans-serif`; `--font-body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif`; `--font-sans` has the same value as `--font-body`; `--font-serif: "Cormorant Garamond", Georgia, serif`; `--font-antonio: "Antonio", "Arial Narrow", sans-serif` | `font-display`, `font-body`, `font-sans`, `font-serif`, `font-antonio`. |
| Radius | `--radius-sm: 6px`; `--radius-md: 10px`; `--radius-lg: 16px` | Tailwind theme names generate `rounded-sm`, `rounded-md`, `rounded-lg`. |
| Animation | `--animate-fade: fade-in 1.2s ease both`; `--animate-jelly-drop: jelly-drop 2.1s both`; `--animate-ground-pulse: ground-pulse 2.1s ease both` | `animate-fade`, `animate-jelly-drop`, `animate-ground-pulse`. |
| Spacing, durations/easings, z-index | No custom CSS variables in the listed stylesheet. | Components use Tailwind utilities and, in some cases, inline `transitionDuration` values. |

The dark defaults are in `:root` and repeated in `:root[data-theme="dark"], .dark`.
There is no light-valued variable block in `index.css`; `ThemeProvider` sets
`<html class="dark">` only when the theme is dark and sets
`document.documentElement.style.colorScheme`.
`@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));`
also recognizes `data-theme="dark"`.

Font faces declared in CSS are `"Barlow Condensed"` (weights 600 and 700) and
`"Inter"` (400–600). The CSS references `/public/fonts/...`; the actual files
are in `public/fonts/`. `"Cormorant Garamond"` and `"Antonio"` are named in
`@theme`, but no `@font-face` for them appears in this file.

### Custom styles and motion

- `@layer base`: `html`, `body`, and `#root` have `height: 100%`, `margin: 0`,
  and `overflow: hidden`; body uses `--bg`, `--text`, and `--font-sans`, with
  `-webkit-font-smoothing: antialiased`.
- `@layer base .display`: `font-family: var(--font-display)`, weight `700`,
  line-height `1.05`, letter spacing `0.01em`, and uppercase text.
- `@layer base :focus-visible`: `2px solid var(--accent)` outline and `2px`
  outline offset.
- `@layer components .btn`: weight `500`, font size `0.95rem`, padding
  `0.75rem 1.5rem`, `var(--radius-sm)`, transparent border, and background /
  transform transitions of `0.2s`.
- `.btn-primary`: accent background and on-accent text; hover uses
  `--accent-hover`, `translateY(-1px)`, and no text decoration.
- `.btn-ghost`: transparent background, text and border tokens; hover uses
  `--surface-alt` and no text decoration.
- `.card`: surface background, 1px border, `--radius-md`, `1.5rem` padding,
  and `0.2s` shadow / transform transition. Hover uses `--shadow`.
- Keyframes: `fade-in`, `jelly-drop`, and `ground-pulse`, with their timing and
  transform stops specified in `src/index.css`.
- `src/index.css` itself has no `prefers-reduced-motion` rule. Components such
  as `Modal`, `SelectInput`, `DashboardShell`, and `Sidebar` use
  `motion-reduce:transition-none`. `GlowBorder.jsx` defines its own
  `@media (prefers-reduced-motion: reduce)` rule for `.glow-sweep`.

### Component token usage and theme handling

Components commonly use classes such as `bg-bg`, `bg-surface`,
`bg-surface-alt`, `border-border`, `text-text`, `text-muted`, `text-accent`,
`bg-accent`, `text-on-accent`, `text-error`, `text-success`,
`text-warning`, and `shadow-soft`. Legacy utilities appear in
`ThemeToggle.jsx`, for example `border-line`, `text-sage-deep`, and
`bg-sage-wash`. Tailwind is imported with `@import "tailwindcss";`; no separate
Tailwind config file is referenced in the inspected files.

`ThemeProvider` initializes from localStorage key `"ronak-theme"`; absent a
valid stored `"light"` or `"dark"` value it reads
`window.matchMedia("(prefers-color-scheme: dark)")`. System changes are followed
only when there is no stored choice. Its context value is
`{ theme, isDark, setTheme, toggleTheme }`. `useTheme()` throws
`"useTheme must be used inside <ThemeProvider>"` outside the provider.

## 2. Redux and Appwrite user service

### Store entry points

| Path | Purpose | Exports | Dependencies | Example |
|---|---|---|---|---|
| `src/store/store.js` | Configures Redux Toolkit's store. Only `auth`, `products`, and `users` reducers are registered. `configureStore` is used without a custom middleware argument; Redux Toolkit's default middleware behavior is not overridden. | Default `store`. | `authSlice`, `productsSlice`, `userSlice`, `@reduxjs/toolkit`. | `src/main.jsx`: `<Provider store={store}>`. |
| `src/store/slices/hooks.js` | Small React-Redux hook wrappers. | `useAppDispatch`, `useAppSelector`. | `react-redux`. | Auth pages call `useAppDispatch()` and `useAppSelector(selectAuthStatus)`. |
| `src/store/slices/index.js` | Empty file. | No exports. | None. | No barrel usage found. Imports target slice files directly. |
| `src/store/slices/services.js` | Re-exports Appwrite services from one module. | `authService`, `userService`, `productService`, `cartService`, `wishlistService`, `orderService`, `alertService`, `settingsService`, `layoutService`, `reviewService`. | `src/lib/appwrite/index.js`. | `authSlice.js` imports `{ authService, userService } from './services'`. |
| `src/store/slices/utils.js` | Shared thunk helpers, error/toast metadata, and user-id helpers. | `LOGIN_REQUIRED`, `isRow`, `getUserId`, `toRows`, `fail`, `stripToast`, `serviceThunk`. | `@reduxjs/toolkit`. | `cartSlice.js` calls `getUserId`, `fail`, and `stripToast`. |

`src/store/store.js` state keys are `auth`, `products`, and `users`. Its
cart/orders/wishlist/ui reducer entries are commented out; those slice modules
exist but are not registered by this store file. The code imports `usersReducer`
from `./slices/userSlice`, and that file is present in the working tree.

### `src/store/slices/authSlice.js`

**Purpose:** owns the active auth profile, signup's pending profile, auth-ready
flag, request status/error, and derived role flags.

**Exports:** default reducer; `clearAuthError`; thunks `initAuth`, `signUp`,
`signIn`, `continueWithEmail`, `registerWithEmail`, `saveName`,
`completeLogin`, `continueWithGoogle`, `logout`, `logoutAll`,
`refreshProfile`, `updateProfile`, `changeAvatar`, `updateName`,
`sendPasswordRecovery`, `confirmPasswordRecovery`, `sendVerification`,
`confirmVerification`, `updatePassword`; matcher `isSessionEnded`; selectors
`selectProfile`, `selectIsLoggedIn`, `selectPendingProfile`,
`selectAuthChecked`, `selectAuthStatus`, `selectAuthError`, `selectRole`,
`selectIsStaff`, `selectIsAdmin`; helper `getAvatarUrl`.

**State shape:**

```js
{
  profile: null,
  pendingProfile: null,
  authChecked: false,
  status: 'idle',
  error: null,
  roleFlags: { role: null, isAdmin: false, isStaff: false },
}
```

`roleFlags` is built from the profile's `role`; `isAdmin` is only role
`'admin'`, while `isStaff` includes `'admin'`, `'support'`, and `'manager'`.

**Thunks / behavior:**

| Thunk | Argument / result | Calls and handling |
|---|---|---|
| `initAuth()` | No argument; profile row or `null`. | Calls `authService.getCurrentProfile()`. Catches every thrown error and returns `null`. |
| `signUp({ email, password, name })` | Profile row, or rejected readable message. | `authService.signUp`; created by `profileThunk`, which strips `toast` before service call and can set rejection meta `{ toast: true }`. |
| `signIn({ email, password })` | Profile row or rejected message. | `authService.signIn` via `profileThunk`. |
| `continueWithEmail(...)` | Profile row or rejected message. | `authService.continueWithEmail` via `profileThunk`. |
| `registerWithEmail({ email, password, toast? })` | Profile row or rejected message. | Calls `authService.signUp` after `stripToast`; sets `pendingProfile` when fulfilled. |
| `saveName({ name, toast? })` | Saved profile row / profile-shaped fallback. | Uses `pendingProfile || profile`; gets ID through `getUserId`; calls `userService.updateProfile({ userId, data: { name } })`, then `authService.updateName({ name })` as best effort. Failure of the auth-record name update does not stop flow. |
| `completeLogin()` | Result from `authService.completeLogin()`. | Via `profileThunk`; comment says used once at `/auth/callback`. |
| `continueWithGoogle()` | `true`. | Calls synchronous `authService.continueWithGoogle()`; browser redirect is expected. |
| `logout(arg?)`, `logoutAll(arg?)` | `true` or rejection. | Calls matching auth service. `isSessionEnded` is `isAnyOf(logout.fulfilled, logoutAll.fulfilled)`. |
| `refreshProfile()` | Profile row. | Reads current auth profile id, then `userService.getProfile`. Rejects when no ID or no row. |
| `updateProfile({ data, toast? })` | Profile row or merged profile fallback. | Calls `userService.updateProfile` with current profile id and `data`; returns the service row if `isRow(result)`. |
| `changeAvatar({ file, oldFileId, toast? })` | Profile row / refreshed row / old profile fallback. | Calls `userService.changeAvatar`; if result is not a row, re-reads with `getProfile`. File is passed only as thunk argument. |
| `updateName({ name, toast? })` | Refreshed profile or merged fallback. | Calls `authService.updateName`; then `userService.getProfile`. |
| `sendPasswordRecovery`, `confirmPasswordRecovery`, `sendVerification`, `confirmVerification`, `updatePassword` | `true` or rejected message. | Created by `actionThunk`; calls the matching auth service method; `false` becomes rejection with readable service or fallback message. |

`profileSetters` updates `profile` and `roleFlags` on fulfilled
`initAuth`, `signUp`, `signIn`, `continueWithEmail`, `completeLogin`,
`refreshProfile`, `updateProfile`, `changeAvatar`, `updateName`, and `saveName`.
Tracked thunks set `status` to `loading`, `succeeded`, or `failed`; rejected
state error is `action.payload || action.error?.message || 'Something went wrong.'`.
`clearAuthError` only sets `error = null`. Successful logout resets auth to
`initialState` with `authChecked: true`.

**Selectors:** `selectProfile` returns `state.auth.profile`;
`selectIsLoggedIn` returns `Boolean(profile)`;
`selectPendingProfile` returns pending signup profile;
`selectAuthChecked`, `selectAuthStatus`, and `selectAuthError` return their
same-named state fields; `selectRole`, `selectIsStaff`, `selectIsAdmin` read
`roleFlags`; `getAvatarUrl(fileId)` calls
`userService.getAvatarUrl({ fileId })`.

Real usage:

```jsx
const status = useAppSelector(selectAuthStatus);
const result = await dispatch(signIn({ email, password }));
if (signIn.fulfilled.match(result)) {
  navigate(homePathFor(result.payload, from), { replace: true });
}
```

This flow appears in `src/pages/shared/account/Signin.jsx`.

### `src/store/slices/userSlice.js`

**Purpose:** entity-adapter collection of user profiles, designed for `none`,
`self`, and `team` scopes. In team scope the slice can hold every profile;
otherwise it intends to hold only the current user's own row.

**Dependencies:** Redux Toolkit and
`src/lib/appwrite/user.js` (`userService`, `isStaffRole`).

**Initial state shape:** `createEntityAdapter` adds `ids` and `entities`.

```js
{
  ids: [],
  entities: {},
  meId: null,
  scope: 'none',
  meStatus: 'idle',
  listStatus: 'idle',
  error: null,
  pendingIds: [],
  filters: { query: '', role: 'all', blocked: 'all' },
}
```

`DEFAULT_USER_FILTERS` is exported with those same three filter fields.
`role` supports `'all'`, `admin`, `support`, `manager`, `customer`, `loyal`,
`new`; `blocked` supports `'all'`, `'blocked'`, `'active'`.

**Thunks:**

| Thunk | Argument / behavior |
|---|---|
| `loadMyProfile({ user })` | Calls `userService.ensureProfile({ user })`; rejects with `'Could not load your profile.'` if falsy. |
| `refreshMyProfile()` | Uses `state.users.meId`, calls `userService.getProfile({ userId: meId })`; rejects without an id or row. |
| `fetchUsers()` | Requires `selectMe(state)`. Non-staff resolves to `{ scope: 'self', rows: [me] }`; staff calls `userService.getProfiles()` and resolves team rows or rejects with the Appwrite `"admin"` label message. |
| `updateMyProfile(data)` | Uses `users.meId`; calls `userService.updateOwnProfile({ userId: meId, data })`; rejects if no session or save result. |
| `setUserBlocked({ userId, isBlocked })` | Requires `users.scope === 'team'`; rejects self-block; calls `userService.setBlocked`. |
| `setUserRole({ userId, role })` | Requires team scope; rejects changing own role; calls `userService.setRole`. |

**Reducers/actions:** `setUserQuery`, `setUserRoleFilter`,
`setUserBlockedFilter`, `resetUserFilters`, `clearUserError`, and `clearUsers`.
`clearUsers()` returns the original adapter `initialState`.

**Selectors:** `selectAllUsers` and `selectUserById` are adapter selectors;
`selectUsersScope`, `selectUsersError`, `selectUsersListStatus`,
`selectMeStatus`, `selectUserFilters`, and `selectPendingUserIds` return
their matching state fields; `selectMe` returns the entity at `meId` or null;
`selectIsTeam` derives from `selectMe()?.role`; `selectIsBlocked` is true only
when the own profile has `isBlocked === true`; `selectVisibleUsers` filters
case-insensitively on name, email, username, phone, lastCity, and role, plus
role and blocked filters; `selectUserStats` returns
`{ total, blocked, active, byRole, totalSpent, orders }`.

**Business rules:** blocking and role changes are team-only and reject
self-targets. Block requests optimistically set `isBlocked`, then upsert the
returned profile or roll back to `!isBlocked` on rejection. Role changes add
the id to `pendingIds`, but do not optimistically change the role. On profile
refresh, a demoted non-staff user loses other entities. `updateMyProfile`
delegates allowed-field filtering to `updateOwnProfile`.

**Integration gap:** `src/store/store.js` registers this reducer as `users`,
but `src/App.jsx` only dispatches `initAuth()`. A source search found no
dispatch of `loadMyProfile`, `refreshMyProfile`, `fetchUsers`, `updateMyProfile`,
`setUserBlocked`, `setUserRole`, or `clearUsers` outside this slice. Auth
currently stores its profile separately as `state.auth.profile`; the router
reads that auth profile, not `state.users`. `clearUsers` is not wired to
`isSessionEnded` in the shown slice.

### Other existing store slices

These modules are present under `src/store/slices/`, but their reducers are
commented out in `store.js`. Their APIs do not imply that their state exists in
the configured store.

| Path | Purpose / initial-state summary | Exports and real use |
|---|---|---|
| `src/store/slices/cartSlice.js` | Cart lines, count, subtotal, delivery charges, total, status, updating, error. Guest writes open the login modal; mutations reload cart. | `fetchCart`, `addToCart`, `setCartQuantity`, `removeFromCart`, `clearCart`, cart selectors. Imports `services`, `utils`, `authSlice`, `uiSlice`. Its source has usage examples, including `dispatch(addToCart({ productId: p.$id, quantity: 1, variant: 'M', toast: true }))`. |
| `src/store/slices/ordersSlice.js` | Adapter-backed orders plus list, detail, place-order states, and `lastPlacedOrder`. `placeOrder` builds items from cart lines and refreshes profile/cart/wishlist. | `PAYMENT_METHODS`, `DELIVERY_TYPES`, `placeOrder`, `fetchMyOrders`, `fetchOrder`, `fetchOrderByNumber`, `clearLastPlacedOrder`, selectors, `parseOrderItems`. Imports `services`, `utils`, auth/cart/wishlist/ui slices. |
| `src/store/slices/wishlistSlice.js` | `{ productIds, products, status, error }`; toggle is optimistic and rolls back on failure. | `fetchWishlist`, thunk-like `toggleWishlist`, `clearWishlist`, selectors. Imports wishlist service, utils, auth/ui slices. |
| `src/store/slices/uiSlice.js` | Login modal, cart drawer, mobile menu, search, theme, and toast state. Toast list is capped at five. | Modal/drawer/menu/search/theme/toast actions and selectors; handles selected auth success and rejected actions with `meta.toast === true`. Imports auth slice matchers/thunks. |
| `src/store/slices/productsSlice.js` | Adapter-backed product entities, filters and list/detail/featured/related/category/group/price/admin status blocks. Stale list responses are ignored by request id. | Product fetch/admin thunks, filter reducers, selectors, and image helpers. Imports `productService` directly. `src/pages/admin/dashboard/Products.jsx` uses `fetchProducts`, filter selectors/actions, and product admin thunks. |

## 3. UI components (`src/ui/custom/**`)

All prop types below are JavaScript-inferred; these files declare no TypeScript
types or PropTypes. Unless noted, the component owns small UI state but receives
its selected value as a prop.

### Inputs

#### `src/ui/custom/input/SearchInput.jsx`

- **Purpose / exports:** default `SearchInput`; debounced search field.
- **Dependencies:** React hooks, `Loader2`, `Search`, `X` from `lucide-react`.
- **Props:** `value = ''`; `onSearch` (optional callback); `placeholder = 'Search'`;
  `label = 'Search'`; `delay = 350`; `loading = false`; `size = 'md'`;
  `className = ''`.
- **Control/events:** maintains local `text`, syncs it when `value` changes,
  and calls `onSearch(clean)` after `delay` ms; Enter commits immediately;
  Escape clears a nonempty value; clear button commits `''`.
- **Classes/animation:** relative wrapper; input uses
  `w-full rounded-md border border-border bg-bg ... focus:border-accent
  focus:ring-4 focus:ring-accent/15`; `sm` is `h-10 text-sm`, otherwise
  `h-12 text-base`; spinner uses `animate-spin`.
- **Real usage** (`src/pages/admin/dashboard/Products.jsx`):

```jsx
<SearchInput
  size="sm"
  value={filters.searchTerm}
  onSearch={onSearch}
  loading={loading && Boolean(filters.searchTerm)}
  placeholder="Search name, category, tags"
  label="Search products"
  className="sm:col-span-2 lg:col-span-1"
/>
```

#### `src/ui/custom/input/SelectInput.jsx`

- **Purpose / exports:** default `SelectInput`; custom dropdown, not native
  `<select>`.
- **Dependencies:** React hooks, `Check`, `ChevronDown`, `Plus`, `Search`, `X`.
- **Props:** `label`; `value`; `onChange`; `options = []` (string values or
  `{ value, label }`); `placeholder = 'Select…'`; `searchable = false`;
  `creatable = false`; `clearable = false`; `error`; `hint`; `disabled = false`;
  `required = false`; `emptyText = 'Nothing found'`; `size = 'md'`;
  `className = ''`; `'aria-label': ariaLabel`.
- **Control/events:** selection is controlled by `value`/`onChange`. Internal
  state controls open/query/active index/drop direction and animation.
  Supports arrows, Enter, Escape, Tab, Home/End without search, and letter
  navigation without a filter. Click outside closes. `creatable` adds a
  matching `Add “…”` row.
- **Classes/animation:** trigger uses `h-10 text-sm` or
  `h-12 text-base lg:h-[3.25rem]`; popup uses
  `z-30 ... bg-surface shadow-soft transition duration-150 ... motion-reduce:transition-none`,
  with scale/translate/opacity transitions.
- **Real usages** (`src/pages/admin/dashboard/Products.jsx`):

```jsx
<SelectInput
  size="sm"
  aria-label="Filter by category"
  placeholder="All categories"
  options={categories}
  value={filters.category || ''}
  onChange={(category) => applyFilters({ category: category || null })}
  searchable
  clearable
/>
```

`src/components/admin/products/ProductForm.jsx` also sets `creatable` and
`required` for category and group fields.

#### `src/ui/custom/input/SwitchInput.jsx`

- **Purpose / exports:** default `SwitchInput`; labeled on/off button.
- **Dependencies:** React `useId`.
- **Props:** `label` (no default); `description`; `checked = false`;
  `onChange`; `disabled = false`; `className = ''`.
- **Control/events:** controlled by `checked`; button click calls
  `onChange?.(!checked)`. Uses `role="switch"` and `aria-checked`.
- **Classes/animation:** wrapper `flex ... rounded-md border border-border
  bg-bg px-4 py-3`; track changes between `bg-accent` and `bg-surface-alt`;
  thumb uses `transition-transform` and `translate-x-5`.
- **Real usage** (`src/components/admin/products/ProductForm.jsx`):

```jsx
<SwitchInput
  label="Featured"
  description="Show this product in the featured section on the home page."
  checked={form.featured}
  onChange={set('featured')}
  disabled={saving}
/>
```

#### `src/ui/custom/input/TagInput.jsx`

- **Purpose / exports:** default `TagInput`; chips editor.
- **Dependencies:** React `useId`, `useState`; `X` icon.
- **Props:** `label`; `value = []`; `onChange`; `placeholder = 'Add a tag'`;
  `hint`; `error`; `max = 20`; `maxLength = 30`; `disabled = false`;
  `className = ''`.
- **Control/events:** controlled `value` array of strings and
  `onChange(nextArray)`; internal draft string. Enter/comma add, paste containing
  commas/newlines splits, blur adds, Backspace on empty removes last tag.
  Duplicate check is case-insensitive.
- **Classes/animation:** `flex min-h-12 flex-wrap ... rounded-md border ...
  bg-bg`; focus-within accent border/ring; chips use `bg-surface-alt`.
- **Real usage** (`src/components/admin/products/ProductForm.jsx`):

```jsx
<TagInput
  label="Tags"
  value={form.tags}
  onChange={set('tags')}
  hint="Press Enter or comma after each tag."
  disabled={saving}
/>
```

#### `src/ui/custom/input/TextInput.jsx`

- **Purpose / exports:** default `TextInput`; labeled input or textarea.
- **Dependencies:** React `useId`.
- **Props:** `label`; `error`; `hint`; `as = 'input'`; `prefix`; `suffix`;
  `required = false`; `showCount = false`; `className = ''`; remaining props
  are spread onto the input/textarea.
- **Control/events:** value and callbacks are passed through in `...props`;
  effectively controlled when a caller supplies `value`/`onChange`.
- **Classes/animation:** shared `BASE` is
  `w-full rounded-md border bg-bg text-base text-text outline-none transition
  placeholder:text-muted/60 focus:border-accent focus:ring-4
  focus:ring-accent/15 disabled:opacity-60`; input height `h-12`; textarea uses
  `py-3`; errors use `border-error`.
- **Real usage** (`src/components/admin/products/ProductForm.jsx`):

```jsx
<TextInput label="Name" required value={form.name} onChange={onName} error={errors.name} maxLength={120} disabled={saving} />
```

#### `src/ui/custom/input/ImageUploader.jsx`

- **Purpose / exports:** default `ImageUploader`; controlled image previews,
  drag-and-drop and main-image ordering. It creates preview items; parent uploads.
- **Dependencies:** React effects/refs/state; `ImagePlus`, `Star`, `Trash2`.
- **Props:** `items` (array); `onChange`; `label = 'Images'`; `hint`; `error`;
  `max = 8`; `maxSizeMB = 5`; `disabled = false`.
- **Item shapes:** existing image `{ key, kind: 'existing', id, url }`; new
  image `{ key, kind: 'new', file, url }`.
- **Control/events:** parent-controlled `items`; calls `onChange(nextItems)`.
  Accepts `image/*`, rejects non-image/over-size files, limits total count,
  supports drop/click selection, removal and making first item main. It revokes
  new-image object URLs on removal and unmount.
- **Classes/animation:** responsive preview grid `grid grid-cols-2 ... sm:grid-cols-3`;
  action controls reveal on hover/focus at `sm`; dashed drop target changes
  border/background when dragging.
- **Real usage** (`src/components/admin/products/ProductForm.jsx`):

```jsx
<ImageUploader
  label="Product images"
  items={images}
  onChange={(next) => {
    setImages(next);
    setErrors((er) => ({ ...er, images: undefined }));
  }}
  error={errors.images}
  hint="The first image is the main one. Use the star to change it."
  disabled={saving}
/>
```

### Modals

#### `src/ui/custom/modal/Modal.jsx`

- **Purpose / exports:** default `Modal`; portal dialog with center or right
  drawer variant, focus return/trapping, Escape/backdrop close, body scroll lock,
  and exit animation.
- **Dependencies:** React hooks, `createPortal`, `X`.
- **Props:** `open`; `onClose`; `title`; `description`; `children`; `footer`;
  `variant = 'center'`; `busy = false`; `layer = 'z-50'`.
- **Control/events:** controlled by `open`; Escape and backdrop call
  `onClose` only when not busy. Close button is disabled when busy.
- **Classes/animation:** center panel is `max-h-[90dvh] ... max-w-md rounded-lg`,
  scales/fades over 200ms; drawer is full height, `sm:max-w-2xl`, slides from
  right over 300ms and is full-screen on narrow viewports. Renders via portal
  into `document.body`.
- **Real usage** (`src/ui/custom/modal/ConfirmDialog.jsx`):

```jsx
<Modal
  open={open}
  onClose={onCancel}
  title={title}
  busy={busy}
  layer="z-[60]"
  footer={
    <div className="flex justify-end gap-3">
      <ActionButton variant="secondary" onClick={onCancel} disabled={busy}>
        {cancelLabel}
      </ActionButton>
      <ActionButton variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
        {confirmLabel}
      </ActionButton>
    </div>
  }
>
  <p className="text-sm text-muted">{message}</p>
  {error && (
    <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-error/40 bg-error/10 px-3 py-2.5 text-sm text-error">
      <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </div>
  )}
</Modal>
```

#### `src/ui/custom/modal/ConfirmDialog.jsx`

- **Purpose / exports:** default `ConfirmDialog`; confirmation dialog using
  `Modal`; `danger` selects danger confirm styling.
- **Dependencies:** `AlertCircle`, `ActionButton`, `Modal`.
- **Props:** `open`; `title`; `message`; `confirmLabel = 'Confirm'`;
  `cancelLabel = 'Cancel'`; `danger = false`; `busy = false`; `error = ''`;
  `onConfirm`; `onCancel`.
- **Control/events:** controlled by `open`; callbacks are passed to buttons and
  modal close. `error` renders `role="alert"`.
- **Real usage** (`src/pages/admin/dashboard/Products.jsx`):

```jsx
<ConfirmDialog
  open={deleteOpen}
  danger
  busy={deleting}
  error={deleteError}
  title="Delete product?"
  message={toDelete ? `“${toDelete.name}” and its images will be removed permanently.` : ''}
  confirmLabel="Delete"
  onConfirm={confirmDelete}
  onCancel={() => setDeleteOpen(false)}
/>
```

### Buttons and toggles

#### `src/ui/custom/button/ActionButton.jsx`

- **Purpose / exports:** default `ActionButton`; dashboard button with loading,
  icon, variants, and sizes.
- **Dependencies:** `Loader2`.
- **Props:** `variant = 'primary'` (`primary | secondary | danger | ghost`);
  `size = 'md'` (`sm | md`); `loading = false`; `icon: Icon`; `disabled = false`;
  `type = 'button'`; `className = ''`; `children`; remaining props are spread
  to `<button>`.
- **Control/events:** native button props are forwarded; disabled if
  `disabled || loading`. Shows spinner instead of icon while loading.
- **Exact shared classes:** base
  `inline-flex shrink-0 items-center justify-center gap-2 rounded-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60`;
  primary `bg-accent text-on-accent hover:bg-accent-hover`; secondary
  `border border-border bg-surface text-text hover:bg-surface-alt`; danger
  `bg-error text-white hover:opacity-90`; ghost
  `text-muted hover:bg-surface-alt hover:text-text`; sizes are
  `h-9 px-3 text-sm` and `h-11 px-4 text-[0.95rem]`.
- **Real usage** (`src/pages/admin/dashboard/Products.jsx`):

```jsx
<ActionButton icon={Plus} onClick={openAdd}>
  Add product
</ActionButton>
```

#### `src/ui/custom/button/SimpleButton.jsx`

- **Current implementation:** no props or callbacks; returns a `<div>` with
  text `SimpleButton`. Imports React and has a default `SimpleButton` function.
- **Usage:** no usage found in `src/`.
- **Full file:**

```jsx
import React from 'react'

function SimpleButton() {
  return (
    <div>SimpleButton</div>
  )
}

export default SimpleButton
```

#### `src/ui/custom/button/RoundedWithIcon.jsx`

- **Current implementation:** no props or callbacks; returns a `<div>` with
  text `RoundedWithIcon`. Imports React and has a default `RoundedWithIcon`
  function.
- **Usage:** no usage found in `src/`.
- **Full file:**

```jsx
import React from 'react'

function RoundedWithIcon() {
  return (
    <div>RoundedWithIcon</div>
  )
}

export default RoundedWithIcon
```

#### `src/ui/custom/button/DualCombination.jsx`

- **Current implementation:** no props or callbacks; returns a `<div>` with
  text `DualCombination`. Imports React and has a default `DualCombination`
  function.
- **Usage:** no usage found in `src/`.
- **Full file:**

```jsx
import React from 'react'

function DualCombination() {
  return (
    <div>DualCombination</div>
  )
}

export default DualCombination
```

#### `src/ui/custom/toggles/TriInputToggle.jsx`

- **Current implementation:** no props or callbacks; returns a `<div>` with
  text `TriInputToggle`. Imports React and has a default `TriInputToggle`
  function.
- **Usage:** no usage found in `src/`.
- **Full file:**

```jsx
import React from 'react'

function TriInputToggle() {
  return (
    <div>TriInputToggle</div>
  )
}

export default TriInputToggle
```

#### `src/ui/custom/toggles/Toogle.jsx`

- **Current implementation:** misspelled filename and export `Toogle`; no props
  or callbacks; returns a `<div>` with text `Toogle`. Imports React.
- **Usage:** no usage found in `src/`.
- **Full file:**

```jsx
import React from 'react'

function Toogle() {
  return (
    <div>Toogle</div>
  )
}

export default Toogle
```

#### `src/ui/custom/toggles/ThemeToggle.jsx`

- **Purpose / exports:** default `ThemeToggle`; toggles context between light
  and dark.
- **Dependencies:** `Moon`, `Sun`; `useTheme` from
  `src/context/ThemeContext.jsx`.
- **Props/events:** no props; click calls `toggleTheme`; accessible label and
  title switch based on `isDark`.
- **Classes:** `inline-grid size-10 ... rounded-full border border-line
  bg-surface text-sage-deep ... hover:border-sage hover:bg-sage-wash ...`.
- **Real use:** `src/pages/shared/structure/Home.jsx` renders `<ThemeToggle />`.

### UI prop tables

These are JavaScript-inferred descriptions, not declared runtime validators.
“Required” means the current implementation expects a caller value for its
controlled behavior; there is no PropTypes or TypeScript enforcement.

#### `src/ui/custom/input/SearchInput.jsx`

| Prop | Inferred type | Default | Required |
|---|---|---|---|
| `value` | `string` | `''` | No |
| `onSearch` | `(text: string) => void` | none | No |
| `placeholder` | `string` | `'Search'` | No |
| `label` | `string` | `'Search'` | No |
| `delay` | `number` | `350` | No |
| `loading` | `boolean` | `false` | No |
| `size` | `'sm' | 'md'` (other values use the non-`sm` branch) | `'md'` | No |
| `className` | `string` | `''` | No |

#### `src/ui/custom/input/SelectInput.jsx`

| Prop | Inferred type | Default | Required |
|---|---|---|---|
| `label` | `string` | none | No |
| `value` | selected option value | none | Used as controlled selected value |
| `onChange` | `(value) => void` | none | No |
| `options` | `Array<string | { value, label }>` | `[]` | No |
| `placeholder` | `string` | `'Select…'` | No |
| `searchable` | `boolean` | `false` | No |
| `creatable` | `boolean` | `false` | No |
| `clearable` | `boolean` | `false` | No |
| `error` | `string` | none | No |
| `hint` | `string` | none | No |
| `disabled` | `boolean` | `false` | No |
| `required` | `boolean` | `false` | No |
| `emptyText` | `string` | `'Nothing found'` | No |
| `size` | `'sm' | 'md'` (other values use the non-`sm` branch) | `'md'` | No |
| `className` | `string` | `''` | No |
| `aria-label` | `string` | none | No |

#### `src/ui/custom/input/SwitchInput.jsx`

| Prop | Inferred type | Default | Required |
|---|---|---|---|
| `label` | `string` | none | No (renders as supplied) |
| `description` | `string` | none | No |
| `checked` | `boolean` | `false` | No |
| `onChange` | `(checked: boolean) => void` | none | No |
| `disabled` | `boolean` | `false` | No |
| `className` | `string` | `''` | No |

#### `src/ui/custom/input/TagInput.jsx`

| Prop | Inferred type | Default | Required |
|---|---|---|---|
| `label` | `string` | none | No |
| `value` | `string[]` | `[]` | Used as controlled value |
| `onChange` | `(value: string[]) => void` | none | No |
| `placeholder` | `string` | `'Add a tag'` | No |
| `hint` | `string` | none | No |
| `error` | `string` | none | No |
| `max` | `number` | `20` | No |
| `maxLength` | `number` | `30` | No |
| `disabled` | `boolean` | `false` | No |
| `className` | `string` | `''` | No |

#### `src/ui/custom/input/TextInput.jsx`

| Prop | Inferred type | Default | Required |
|---|---|---|---|
| `label` | `string` | none | No |
| `error` | `string` | none | No |
| `hint` | `string` | none | No |
| `as` | string; used as the rendered tag | `'input'` | No |
| `prefix` | renderable content | none | No |
| `suffix` | renderable content | none | No |
| `required` | `boolean` | `false` | No |
| `showCount` | `boolean` | `false` | No |
| `className` | `string` | `''` | No |
| `...props` | forwarded input/textarea props (including `value`, `onChange`, `maxLength`) | none | No |

#### `src/ui/custom/input/ImageUploader.jsx`

| Prop | Inferred type | Default | Required |
|---|---|---|---|
| `items` | array of existing/new image items | none | Yes for current operations |
| `onChange` | `(items: array) => void` | none | Yes for changes to propagate |
| `label` | `string` | `'Images'` | No |
| `hint` | `string` | none | No |
| `error` | `string` | none | No |
| `max` | `number` | `8` | No |
| `maxSizeMB` | `number` | `5` | No |
| `disabled` | `boolean` | `false` | No |

#### `src/ui/custom/modal/Modal.jsx`

| Prop | Inferred type | Default | Required |
|---|---|---|---|
| `open` | `boolean` | none | Yes to control visibility |
| `onClose` | `() => void` | none | No |
| `title` | `string` | none | Used as dialog aria-label / heading |
| `description` | `string` | none | No |
| `children` | renderable content | none | No |
| `footer` | renderable content | none | No |
| `variant` | `'center' | 'drawer'` (other values take center branch) | `'center'` | No |
| `busy` | `boolean` | `false` | No |
| `layer` | `string` (Tailwind class) | `'z-50'` | No |

#### `src/ui/custom/modal/ConfirmDialog.jsx`

| Prop | Inferred type | Default | Required |
|---|---|---|---|
| `open` | `boolean` | none | Yes to control visibility |
| `title` | `string` | none | Yes for dialog heading |
| `message` | `string` | none | No |
| `confirmLabel` | `string` | `'Confirm'` | No |
| `cancelLabel` | `string` | `'Cancel'` | No |
| `danger` | `boolean` | `false` | No |
| `busy` | `boolean` | `false` | No |
| `error` | `string` | `''` | No |
| `onConfirm` | callback | none | No |
| `onCancel` | callback | none | No |

#### `src/ui/custom/button/ActionButton.jsx`

| Prop | Inferred type | Default | Required |
|---|---|---|---|
| `variant` | `'primary' | 'secondary' | 'danger' | 'ghost'` | `'primary'` | No |
| `size` | `'sm' | 'md'` | `'md'` | No |
| `loading` | `boolean` | `false` | No |
| `icon` | React component rendered as `<Icon />` | none | No |
| `disabled` | `boolean` | `false` | No |
| `type` | button type string | `'button'` | No |
| `className` | `string` | `''` | No |
| `children` | renderable content | none | No |
| `...props` | forwarded to `<button>` | none | No |

#### Placeholder buttons and toggles

`src/ui/custom/button/SimpleButton.jsx`,
`src/ui/custom/button/RoundedWithIcon.jsx`,
`src/ui/custom/button/DualCombination.jsx`,
`src/ui/custom/toggles/TriInputToggle.jsx`, and
`src/ui/custom/toggles/Toogle.jsx` have no props, callbacks, or defaults in
their current signatures. `src/ui/custom/toggles/ThemeToggle.jsx` also has no
props; its state/action comes from `useTheme()`.

## 4. Admin products pattern

### Product field helpers

#### `src/components/admin/products/productFields.js`

- **Purpose:** constants, form conversion, validation, and payload construction.
- **Imports:** `productService` from `src/lib/appwrite/product.js`.
- **Exports:** `STATUS_OPTIONS`, `SORT_OPTIONS`, `slugify`, `emptyForm`,
  `productToForm`, `finalPrice`, `validateForm`, `buildPayload`.
- **No field-definition array exists.** The form's shape is the exported
  `emptyForm` object:

```js
{
  name: '',
  slug: '',
  description: '',
  category: '',
  group: '',
  tags: [],
  originalPrice: '',
  discountPercentage: '',
  costPrice: '',
  totalAvailable: '',
  featured: false,
}
```

`STATUS_OPTIONS` has `{ value: 'inStock', label: 'In stock' }` and
`{ value: 'outOfStock', label: 'Out of stock' }`.
`SORT_OPTIONS` values are `newest`, `name-asc`, `name-desc`, `price-asc`,
`price-desc`, `order`.

`slugify(text)` stringifies, lowercases, trims, converts runs outside
`[a-z0-9]` to hyphens, and trims leading/trailing hyphens.
`productToForm(p)` maps product data into form fields; prices and stock are
strings, `tags` is retained only if it is an array, and `featured` becomes a
boolean. `finalPrice(originalPrice, discountPercentage)` calculates discounted
price and rounds it with `Math.round`.

`validateForm(form, imageCount)` requires a nonblank name, category, group,
original price above zero, discount from 0 to 100, nonnegative cost when
provided, integer stock at least 0, and at least one image. It returns an
object of field-keyed error strings.
`buildPayload(form, { slug, imageIds, sold = 0 })` trims text, converts number
fields, derives `price`, and returns `productService.prepareProductData(data)`.
It only adds `costPrice` when `form.costPrice !== ''`.

**Real use:** `ProductForm.jsx` calls
`validateForm(form, images.length)` and
`buildPayload(form, { slug, imageIds, sold: product?.sold ?? 0 })`.

### Product table

#### `src/components/admin/products/ProductTable.jsx`

- **Purpose / exports:** default `ProductTable`; product row table.
- **Dependencies:** `ImageOff`, `Pencil`, `Star`, `Trash2`; `productService`.
- **Props:** `{ products, onEdit, onDelete, onToggleFeatured, busyId = null }`.
  Each callback receives the product row; callback invocation uses optional
  chaining. `busyId` disables the matching row's featured button.
- **Columns, in order:** Product, Category, Price, Stock, Actions.
- **Header/table classes:** outer
  `overflow-x-auto rounded-lg border border-border bg-surface`; table
  `w-full min-w-[46rem] text-left`; header
  `border-b border-border text-sm text-muted`; header cells
  `px-4 py-3 font-medium`, with Actions also `text-right`.
- **Rows:** `border-b border-border last:border-0 hover:bg-surface-alt/50`;
  row key `p.$id`. Product image box is `size-14 ... rounded-md border
  border-border bg-surface-alt`; image is `size-full object-cover`. Category,
  group, slug, name use `text-text` / `text-muted`.
- **Price:** displays `p.priceFormat || productService.formatPrice(p.price)`.
  If `Number(p.discountPercentage) > 0`, it shows formatted
  `p.originalPrice` crossed out and `{p.discountPercentage}% off`.
- **Stock badge:** `remaining = Number(product.remaining) || 0`; out when
  `status === 'outOfStock' || remaining <= 0`; low when not out and
  `remaining <= 5`; tones `text-error`, `text-warning`, `text-success`.
  Second line is `{remaining} left of {product.totalAvailable ?? 0}`.
- **Actions:** star toggles featured and exposes `aria-pressed`; Pencil calls
  edit; Trash calls delete. Shared exact class:
  `flex size-9 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50`.
  Delete adds `hover:text-error`; edit adds `hover:text-text`.
- **Responsive behavior:** horizontal scroll around a table with
  `min-w-[46rem]`; rows themselves do not change to cards.
- **Empty/loading states and toolbar:** none in this component. Parent
  `Products.jsx` owns them.
- **Real use** (`src/pages/admin/dashboard/Products.jsx`):

```jsx
<ProductTable
  products={products}
  busyId={busyId}
  onEdit={openEdit}
  onDelete={(p) => {
    setToDelete(p);
    setDeleteError('');
    setDeleteOpen(true);
  }}
  onToggleFeatured={toggleFeatured}
/>
```

### Product form

#### `src/components/admin/products/ProductForm.jsx`

- **Purpose / exports:** default `ProductForm`; add/edit product drawer.
- **Dependencies:** React state, Redux `useDispatch`; `AlertCircle`;
  `addProduct`, `updateProduct`; product service; `ActionButton`,
  `ImageUploader`, `SelectInput`, `SwitchInput`, `TagInput`, `TextInput`,
  `Modal`; helpers from `productFields.js`.
- **Props:** `open = true`; `product = null`; `categories = []`; `groups = []`;
  `onClose`; `onSaved`. `product === null` means add; non-null means edit.
- **Structure:** `Modal variant="drawer"` with footer Cancel and submit
  buttons; form sections `Images`, `Details`, `Price`, and `Stock`.
  Inputs are rendered directly in JSX, not from a generic field definition
  array. The form has `id="product-form"`, `onSubmit={save}`, `noValidate`,
  `className="space-y-8"`.
- **Validation / slug:** submit calls `validateForm`; slug is normalized from
  typed slug or product name; checks `productService.isSlugAvailable(wanted,
  rowId)`, generates a unique slug when auto/blank, and reports duplicate typed
  slug in `errors.slug`.
- **Save flow:** uploads `kind === 'new'` image files, preserves image order,
  builds payload, dispatches `updateProduct([rowId, payload])` or
  `addProduct([payload])` with `.unwrap()`, deletes removed old images after an
  edit succeeds, then calls `onSaved?.(saved)`. On failure it tries to delete
  newly uploaded images and shows an inline error. `saving` is reset in
  `finally`.
- **Real usage** (`Products.jsx`):

```jsx
<ProductForm
  key={formKey}
  open={formOpen}
  product={editing}
  categories={categories}
  groups={groups}
  onClose={() => setFormOpen(false)}
  onSaved={onSaved}
/>
```

The parent increments `formKey` each time the form opens to obtain fresh local
state and leaves the component mounted after close for the closing animation.

### Products page and dashboard files

#### `src/pages/admin/dashboard/Products.jsx`

- **Purpose / exports:** default `Products`; admin product listing and editing.
- **Dependencies:** React hooks, Redux hooks; product thunks/selectors;
  `ProductForm`, `ProductTable`, `SORT_OPTIONS`, `STATUS_OPTIONS`;
  `ActionButton`, `SearchInput`, `SelectInput`, `ConfirmDialog`; `Plus`.
- **Fetch/filter behavior:** mount dispatches `resetProductFilters()`,
  `fetchProducts()`, `fetchCategories()`, and `fetchGroups({})`.
  `applyFilters(patch)` dispatches `setProductFilters(patch)` then
  `fetchProducts()`. Search uses `onSearch`; categories/groups are sorted
  object keys from category/group counts. Pagination dispatches
  `fetchProducts({ append: true })`.
- **Toolbar:** heading `Products`, count text, Add product action; grid classes
  `grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem]`.
  Search searches name/category/tags; two dropdown filters select category and
  stock status; third selects sort.
- **Modal/dialog:** add/edit set `editing`, increment `formKey`, and open form.
  Delete stores selected row, clears error, and opens `ConfirmDialog`.
  Successful delete closes it and reloads categories/groups. Failed delete
  displays inline dialog error. Featured toggling uses `updateProduct`.
- **Errors/states:** failed initial list shows `"Could not load products."`
  and a `Try again` button; empty list distinguishes filtered and unfiltered
  states; loading and `hasMore` control count and pagination.
- **Related source:** uses ProductTable's callbacks; does not use a toast for
  failures in the shown page.

#### Other `src/pages/admin/dashboard/**` files

| Path | Purpose / exports | Dependencies | Real use |
|---|---|---|---|
| `src/pages/admin/dashboard/AdminPannel.jsx` | Placeholder default `AdminPannel`; renders `<div>AdminPannel</div>`. The spelling is exactly `Pannel`. | React import. | Exported by dashboard barrel, but `App.jsx` routes `Overview.jsx`, not this component. |
| `src/pages/admin/dashboard/Alerts.jsx` | Placeholder default `Alerts`; renders `<div>Alerts</div>`. | React import. | Routed at `/team/:username/alerts`. |
| `src/pages/admin/dashboard/CartAndWishlist.jsx` | Placeholder default `CartAndWishlist`; renders `<div>CartAndWishlist</div>`. | React import. | Routed at `/team/:username/cart-and-wishlist`. |
| `src/pages/admin/dashboard/Finance.jsx` | Placeholder default `Finance`; renders `<div>Finance</div>`. | React import. | Routed at `/team/:username/finance`. |
| `src/pages/admin/dashboard/Orders.jsx` | Placeholder default `Orders`; renders `<div>Orders</div>`. | React import. | Routed at `/team/:username/orders`. |
| `src/pages/admin/dashboard/Overview.jsx` | Placeholder default `Overview`; renders `<div>Overview</div>`. | React import. | Routed as admin index route. |
| `src/pages/admin/dashboard/Settings.jsx` | Placeholder default `Settings`; renders `<div>Settings</div>`. | React import. | Routed at `/team/:username/settings`. |
| `src/pages/admin/dashboard/Users.jsx` | Placeholder default `Users`; renders `<div>Users</div>`. | React import. | Routed at `/team/:username/users`. |
| `src/pages/admin/dashboard/Layout.jsx` | Default `AdminLayout`; returns `<DashboardShell area="admin" />`. | `DashboardShell`. | Wraps all admin child routes in `App.jsx`. |
| `src/pages/admin/dashboard/index.js` | Named barrel: `AdminPannel`, and `export *` from Alerts, CartAndWishlist, Finance, Layout, Orders, Overview, Products, Settings, Users. | Relative imports of dashboard files. | `src/pages/admin/index.js` re-exports this barrel. |
| `src/pages/admin/index.js` | `export * from "./dashboard/index.js";` | Dashboard barrel. | No import use found in `App.jsx`; App imports pages directly. |

**Full files under 40 lines:**

`src/pages/admin/dashboard/Layout.jsx`

```jsx
import DashboardShell from "../../../components/shared/DashboardShell";

// Admin panel (admin, support, manager): the same shared sidebar, admin links.
export default function AdminLayout() {
  return <DashboardShell area="admin" />;
}
```

`src/pages/admin/dashboard/index.js`

```js
export { default as AdminPannel } from "./AdminPannel.jsx";
export * from "./Alerts.jsx";
export * from "./CartAndWishlist.jsx";
export * from "./Finance.jsx";
export * from "./Layout.jsx";
export * from "./Orders.jsx";
export * from "./Overview.jsx";
export * from "./Products.jsx";
export * from "./Settings.jsx";
export * from "./Users.jsx";
```

`src/pages/admin/index.js`

```js
export * from "./dashboard/index.js";
```

## 5. Shared dashboard shell

### `src/components/shared/DashboardShell.jsx`

- **Purpose / exports:** default `DashboardShell`; shared responsive user/admin
  dashboard frame.
- **Dependencies:** React state/effect; `Outlet`, `useLocation`;
  `ChevronsLeft`, `Menu`, `X`; `Sidebar`.
- **Props:** `area = 'user'`; `children`. If `children` is nullish, renders
  `<Outlet />`.
- **Behavior:** desktop (`lg`) fixed sidebar, persisted collapsed state under
  localStorage key `'dashboard-sidebar-collapsed'`; mobile top bar and sliding
  drawer, closes on route change, Escape, or viewport expansion to 1024px.
  During drawer open, body overflow is hidden. Storage failures are caught and
  ignored.
- **Frame classes:** root
  `min-h-dvh bg-bg text-text transition-[grid-template-columns] ... lg:grid`;
  collapsed columns `lg:grid-cols-[4.125rem_minmax(0,1fr)]`, expanded
  `lg:grid-cols-[16rem_minmax(0,1fr)]`; content
  `min-w-0 p-4 sm:p-6 lg:p-10`.
- **Real use:** `AccountLayout` returns
  `<DashboardShell area="user">{children}</DashboardShell>`; admin `Layout.jsx`
  returns `<DashboardShell area="admin" />`.

### `src/components/shared/Sidebar.jsx`

- **Purpose / exports:** default `Sidebar`; shared navigation for both dashboard
  areas.
- **Dependencies:** React state; `Link`, `NavLink`; Lucide icons;
  `useSession`; `PATHS`; `getAvatarUrl`; `LogoutButton`.
- **Props:** `area = 'user'`; `collapsed = false`; `onNavigate`.
- **Navigation definitions:** user links: overview, profile, orders, cart,
  wishlist, reviews, alerts. Admin links: overview, orders, products, users,
  finance, cart & wishlist, alerts, settings. Each URL comes from `PATHS`;
  overview uses `end: true`. Both areas also show `PATHS.products` as
  `"Browse shop"` and a logout row.
- **Active styling:** `NavLink` callback returns
  `flex items-center rounded-sm px-3 py-2.5 text-sm transition-colors
  focus-visible:outline-2 focus-visible:outline-accent`; active state is
  `bg-accent/10 font-medium text-accent`, inactive state is
  `text-muted hover:bg-surface-alt hover:text-text`.
- **Role/profile behavior:** `useSession()` supplies `user`, `username`,
  `isStaff`; `area === 'admin'` selects admin links and profile target.
  Avatar uses `avatarUrl` or `getAvatarUrl(avatarFileId)`, then initials from
  name/username/email. For staff, profile subtitle displays capitalized role;
  otherwise email.
- **Collapsed state:** `Fold` transitions max-width/margin/opacity over
  `duration-300`; collapsed item links use title and aria-label.
- **Real use:** `DashboardShell` renders `<Sidebar area={area} collapsed={collapsed} />`
  and, in mobile drawer, `<Sidebar area={area} onNavigate={() => setOpen(false)} />`.

### `src/components/shared/index.js`

Empty file; no exports and no real usage found.

**Files under 40 lines:**

`src/store/store.js`

```js
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
// import cartReducer from "./slices/cartSlice";
// import ordersReducer from "./slices/ordersSlice";
import productsReducer from "./slices/productsSlice";
// import uiReducer from "./slices/uiSlice";
import usersReducer from "./slices/userSlice";
// import wishlistReducer from "./slices/wishlistSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    // cart: cartReducer,
    // orders: ordersReducer,
    products: productsReducer,
    // ui: uiReducer,
    users: usersReducer,
    // wishlist: wishlistReducer,
  },
});

export default store;
```

`src/store/slices/hooks.js`

```js
import { useDispatch, useSelector } from 'react-redux';

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
```

`src/store/slices/index.js` is empty.

`src/components/shared/index.js` is empty.

## 6. Router and layouts

### Paths

`src/router/path.js` exports `PATHS`, `dashboardHome`, and
`RESERVED_USERNAMES`. The path functions call `encodeURIComponent` on
parameters.

| Constant/function | Exact path/value |
|---|---|
| `PATHS.home` | `"/"` |
| `PATHS.signin` | `"/welcome-back"` |
| `PATHS.signup` | `"/create-account"` |
| `PATHS.products` | `"/products"` |
| `PATHS.productShort(productId)` | `` `/${e(productId)}` `` |
| `PATHS.product(category, group, productId)` | `` `/products/${e(category)}/${e(group)}/${e(productId)}` `` |
| `PATHS.user.overview(u)` | `` `/${e(u)}` `` |
| `PATHS.user.profile(u)` | `` `/${e(u)}/profile` `` |
| `PATHS.user.orders(u)` | `` `/${e(u)}/orders` `` |
| `PATHS.user.cart(u)` | `` `/${e(u)}/cart` `` |
| `PATHS.user.wishlist(u)` | `` `/${e(u)}/wishlist` `` |
| `PATHS.user.reviews(u)` | `` `/${e(u)}/reviews` `` |
| `PATHS.user.alerts(u)` | `` `/${e(u)}/alerts` `` |
| `PATHS.admin.overview(u)` | `` `/team/${e(u)}` `` |
| `PATHS.admin.orders(u)` | `` `/team/${e(u)}/orders` `` |
| `PATHS.admin.products(u)` | `` `/team/${e(u)}/products` `` |
| `PATHS.admin.users(u)` | `` `/team/${e(u)}/users` `` |
| `PATHS.admin.finance(u)` | `` `/team/${e(u)}/finance` `` |
| `PATHS.admin.cartAndWishlist(u)` | `` `/team/${e(u)}/cart-and-wishlist` `` |
| `PATHS.admin.alerts(u)` | `` `/team/${e(u)}/alerts` `` |
| `PATHS.admin.settings(u)` | `` `/team/${e(u)}/settings` `` |
| `RESERVED_USERNAMES` | `["products", "team", "auth", "welcome-back", "create-account"]` |
| `dashboardHome(username, isStaff)` | Staff → `PATHS.admin.overview(username)`; otherwise `PATHS.user.overview(username)`. |

### Route tree from `src/App.jsx`

`App` dispatches `initAuth()` once in `useEffect`, then returns this route
structure in order:

1. `MainLayout` → index `/` → `Home`.
2. `PlainLayout` → `/products` → `AllProducts`.
3. `PlainLayout` → `/products/:category/:group/:productId` → `Product`.
4. `PlainLayout` → `*` → `CatchAllRoute`.
5. `/auth/callback` → `AuthCallback`, outside `GuestRoute`.
6. `AuthLayout` → `GuestRoute` → `/create-account` `Signup`,
   `/welcome-back` `Signin`.
7. `/team/:username` → `ProtectedRoute area="admin"` → `AdminLayout` →
   index `AdminOverview`, and child paths `orders`, `products`, `users`,
   `finance`, `cart-and-wishlist`, `alerts`, `settings`.
8. `/:username` → index `SlugRoute`; then
   `ProtectedRoute area="user"` → `AccountLayout` → child paths `profile`,
   `orders`, `cart`, `wishlist`, `reviews`, `alerts`.

`App.jsx` imports the misspelled filename `./router/ProtecteRoute` and binds
its default export as `ProtectedRoute`.

### Router files

| Path | Purpose / exports | Dependencies and real use |
|---|---|---|
| `src/router/ProtecteRoute.jsx` | Default function declaration `ProtectedRoute({ area = "user" })`; checks ready/login/role/username and renders `<Outlet />` or `<Navigate>`. | `useSession`, `PATHS`, `Navigate`, `Outlet`, `useLocation`, `useParams`; used for team and user nested routes in `App.jsx`. |
| `src/router/GuestRoute.jsx` | Default `GuestRoute()`; prevents a visitor who arrived logged in from using signin/signup, but does not redirect an in-place login/signup that occurs after mount. | `useRef`, `useSession`, `Navigate`, `Outlet`; wraps account guest routes. |
| `src/router/CatchAllRoute.jsx` | Default `CatchAllRoute()`; waits for auth, redirects logged-in visitors to their panel, redirects unknown `/team...` to signin with location state, otherwise shows `NotFound`. | `useSession`, `PATHS`, `NotFound`; `App.jsx` places it under `PlainLayout`. |
| `src/router/SlugRoute.jsx` | Default `SlugRoute()`; resolves `/:something` to own dashboard, reserved redirect, or short product link. | `useSession`, `PATHS`, `RESERVED_USERNAMES`, `productExists`, `PlainLayout`, `AccountLayout`, `Product`, user `Overview`. |
| `src/router/useSession.js` | Default hook reads only `state.auth`. Returns `{ user, isLoggedIn, username, isAdmin, isStaff, isReady, panel, canShop }`; `panel` falls back to `PATHS.products` without username; `canShop = !isStaff`. | `useSelector`, `PATHS`, `dashboardHome`; consumed by route guards and `Sidebar`. |
| `src/router/path.js` | URL constants/functions described above. | `encodeURIComponent`; consumed by routes, links, auth pages. |
| `src/router/useProductId.js` | Default hook returns `productId ?? username` from `useParams()`. | Imports `useParams` from `'react-router-dom'`; comment says it is for `Product.jsx`. This is inconsistent with most files importing from `'react-router'`, and `package.json` lists `react-router` but not `react-router-dom`. |
| `src/router/productLookup.js` | Named async `productExists(slug)` currently always returns `true`; comment says it is not connected to product service. | No project import; called by `SlugRoute`. |

**Guard specifics:** `ProtectedRoute` returns null while not ready; logged-out
users go to `PATHS.signin` with `{ from: location }`; wrong role area or
username redirects to the current user's `panel`. Username comparison is
lowercased. `GuestRoute` remembers the first observed login state in a ref.
`CatchAllRoute` redirects all authenticated unknown URLs to `panel`.
`SlugRoute` starts async lookup for non-reserved non-own slugs and ignores
late results after cleanup; because `productExists` currently returns true,
every such one-segment slug is currently treated as a product.

**Session/profile dispatch:** `src/App.jsx` dispatches `initAuth()` at app
start. `loadMyProfile`, `refreshMyProfile`, and `clearUsers` are not dispatched
in the searched `src/` files. There is a separate `refreshProfile` in
`authSlice.js`, called by `ordersSlice.js` after a successful order.

### Layout files

| Path | Purpose / output | Dependencies / use |
|---|---|---|
| `src/layouts/MainLayout.jsx` | `<main>{children ?? <Outlet />}</main><footer />`; footer is empty. | `Outlet`; wraps only Home in `App.jsx`. Home itself renders its header; `MainLayout` does not. |
| `src/layouts/PlainLayout.jsx` | `<div className="min-h-dvh bg-bg text-text"><main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">...`; renders children or `<Outlet />`. | `Outlet`; wraps products and catchall, and is used by `SlugRoute`. |
| `src/layouts/AuthLayout.jsx` | `<div className="auth-shell">`, a `Link` to home labeled `Store`, then `<main className="auth-card"><Outlet /></main>`. | `Link`, `Outlet`, `PATHS.home`; wraps signin/signup routes. |
| `src/layouts/AccountLayout.jsx` | Returns `<DashboardShell area="user">{children}</DashboardShell>`. | `DashboardShell`; wraps user dashboard routes and user overview in `SlugRoute`. |
| `src/pages/admin/dashboard/Layout.jsx` | Returns `<DashboardShell area="admin" />`. | `DashboardShell`; wraps admin child routes. |

`AuthLayout` uses `auth-shell` and `auth-card`; their CSS definitions are not
in `src/index.css`.

## 7. Auth and account pages

| Path | Purpose / exports | State reads/writes and dependencies | Visual structure / actual use |
|---|---|---|---|
| `src/pages/shared/account/AuthCallback.jsx` | Default `AuthCallback`; finishes Google callback once, guarded by `started` ref for StrictMode. | Dispatches `completeLogin({})`; uses `homePathFor`; holds `newProfile`; navigates to signin on failure, sends new profile to `ProfileStep`. | Full viewport centered `main` with `min-h-dvh`, spinner `animate-spin`, `"Signing you in…"` status; mounts `ProfileStep` for new account. Route is `/auth/callback`, outside GuestRoute. |
| `src/pages/shared/auth/LogoutButton.jsx` | Default `LogoutButton({ className = DEFAULT_CLASS })`; calls logout and redirects on success. | `useAppDispatch`, `logout`, `PATHS.signin`, `useNavigate`; local `busy`; does not show logout rejection text. | Button says `"Signing out…"` while busy, otherwise `"Sign out"`, with `Loader2` or `LogOut`. Sidebar supplies its own class string. |
| `src/pages/shared/account/Signin.jsx` | Default `Signin`; two-step email then password plus Google redirect. | Reads `selectAuthError`, `selectAuthStatus`; dispatches `clearAuthError`, `signIn`, `continueWithGoogle`; local email/password/errors/attempt count; uses `homePathFor`. | `AuthShell` title `"Welcome back"`; email/password `AuthField`s; `GoogleButton`, `AuthButton`, `EmailChip`, `OrDivider`, `FormError`; 3 failed password attempts navigates to `/create-account` with email and `reason: 'attempts'`. |
| `src/pages/shared/account/Signup.jsx` | Default `Signup`; nested `CredentialsStep`, `PasswordMeter`, `passwordScore`. Uses two-step email signup and opens `ProfileStep` after `pendingProfile`. | Reads pending profile, auth error/status; dispatches `registerWithEmail`, `continueWithGoogle`, `clearAuthError`; validates email and password length >= 8. | `AuthShell` title `"Create account"`; email/password steps, Google, `AuthField`, `AuthButton`, `EmailChip`, `Notice`, `OrDivider`, `FormError`, and password strength meter. |
| `src/pages/user/dashboard/Profile.jsx` | Default `Profile`; current component is a placeholder rendering `<div>Profile</div>`. | React import only; no store reads/writes. | No profile form or layout classes. Routed at `/:username/profile` inside `AccountLayout`. |
| `src/pages/user/dashboard/Overview.jsx` | Default `Overview`; current component renders a flex row with `<h1>Overview</h1>` and `<LogoutButton />`. | `LogoutButton`; no store reads of its own. | Exact wrapper class `flex items-center justify-between`; routed by `SlugRoute` for own user username. |
| `src/pages/shared/structure/NotFound.jsx` | Default `NotFound`; simple 404 link. | `Link` and `PATHS.home`. | `<div><h1>Page not found</h1><Link ...>Back to the store</Link></div>`; no theme/container classes. Shown by CatchAllRoute when logged out on a non-team unknown path. |

**Auth pages real usage:** `Signin` and `Signup` are imported directly by
`src/App.jsx`; `AuthCallback` is imported directly as the standalone callback
route. The auth page uses these additional files, whose implementation is not
included in this brief's requested detail: `AuthShell.jsx`, `AuthField.jsx`,
`AuthButton.jsx`, `GoogleButton.jsx`, `ProfileStep.jsx`, and
`authRedirect.js`.

## 8. Naming, imports, and repeated conventions

- JavaScript only in the inspected app files: `.js` for slices/services/helpers,
  `.jsx` for React components; no TypeScript files or type annotations.
- Imports are relative (`../../...`); no `@/` alias found in `src/`.
- Import style is mixed: many older files use double quotes and semicolons;
  newer component files often use single quotes. JSX component files are
  sometimes imported without extension, sometimes with `.jsx`.
- React Router imports are mixed between `'react-router'` and one
  `'react-router-dom'` import in `useProductId.js`.
- Barrels are inconsistent: product barrel has named exports and `export *`;
  admin barrel does too; `src/pages/admin/index.js` forwards the dashboard
  barrel; `src/components/shared/index.js` and `src/store/slices/index.js`
  are empty.
- `AdminPannel` and `ProtecteRoute` are exact misspellings in filenames / names
  and must not be silently corrected when resolving current imports.
  `Toogle` is an exact misspelling in both filename and export.
- Most app UI uses Tailwind utility classes and CSS variable-backed tokens;
  older placeholder components return plain text `<div>`s.
- Async service failures often return `false` and call `console.error` in
  Appwrite service code. Redux thunks generally convert falsy results into
  rejected actions. `utils.fail` attaches `meta.toast` only if an argument
  includes `toast: true`; `uiSlice` converts rejected actions with that metadata
  to error toasts. `userSlice` stores its errors but does not add toast metadata.
- The UI custom inputs are mostly controlled (`value`/`checked` plus callback);
  SearchInput, TagInput draft text, custom select popup, and image drop states
  also have internal UI state.
- `DashboardShell` reads/writes localStorage directly for collapsed sidebar;
  `ThemeProvider` uses localStorage key `"ronak-theme"`.

## 9. Gaps and implementation inconsistencies

1. **User slice is not connected to current auth lifecycle.** `initAuth()` loads
   the profile into `state.auth.profile`; no searched code dispatches
   `loadMyProfile()` or `refreshMyProfile()`. Therefore `users.meId` remains
   unset unless an unlisted caller dispatches the thunk. `clearUsers()` is
   documented in the slice for logout but is not wired to logout matcher or
   dispatched elsewhere.
2. **Configured store excludes several existing slices.** `cart`, `orders`,
   `wishlist`, and `ui` reducer lines are commented out in `store.js`, although
   other slice modules refer to each other's state. This brief records the
   source state and does not assume these reducers are active elsewhere.
3. **Product short-link lookup is a stub.** `productExists()` returns `true`
   for every slug and its own comment says it is not connected to product
   service.
4. **Incomplete UI components:** `SimpleButton`, `RoundedWithIcon`,
   `DualCombination`, `TriInputToggle`, and `Toogle` are placeholder `<div>`
   renderers; no project usage was found.
5. **Dashboard page placeholders:** admin dashboard files `AdminPannel`,
   `Alerts`, `CartAndWishlist`, `Finance`, `Orders`, `Overview`, `Settings`,
   and `Users` render only their component names. User `Profile` is likewise a
   placeholder; user `Overview` is only a heading and logout button.
6. **Route import mismatch:** `useProductId.js` imports `useParams` from
   `react-router-dom`; `package.json` lists `react-router`, not
   `react-router-dom`.
7. **Light theme CSS values are absent:** `index.css` defines dark values in
   `:root` and repeats them in the explicit dark selector, but has no light
   variable block. `ThemeProvider` removes `.dark` for light mode, leaving the
   `:root` values in effect.
8. **Theme state has two sources:** `ThemeProvider` controls the DOM class and
   `ThemeToggle`; `uiSlice` separately defines `theme`, `setTheme`, and
   `toggleTheme`. The Redux UI reducer is commented out in `store.js`, and no
   connection between the context and Redux theme is present in the inspected
   files.
9. **Current codebase does not provide in the requested files:** support email
   or phone settings, the implementation/details for the Appwrite auth service,
   product service, `AuthShell`, `AuthField`, `ProfileStep`, or the user/other
   dashboard implementations. Do not invent these when adding code; inspect
   their source if their behavior matters.
10. **Schema notes:** `appwrite.config.json` defines user table `ronakbyali_users`
   with `reviewIds` as `string[]`, but `user.js` does not reference `reviewIds`.
   The config is the source for types below; Appwrite system fields such as
   `$id` and `$createdAt` are also used by the service but are not listed as
   table columns.

## Appendix A. User service contract

### `src/lib/appwrite/user.js`

- **Purpose:** Appwrite TablesDB and Storage operations for profiles, roles,
  username lookup, profile lists, and avatar files.
- **Project imports:** `env/var.js`, `cart.js`, `wishlist.js`;
  external imports: Appwrite `Client`, `Storage`, `TablesDB`, `Query`, `ID`,
  `Permission`, `Role`.
- **Exports:** `ROLES`, `STAFF_ROLES`, `LOYAL_AFTER_ORDERS`,
  `isStaffRole(role)`, `SELF_EDITABLE_FIELDS`, class `UserService`, default
  singleton `userService`.
- **Configuration fields:** service reads `envVars.ronakByAliDatabaseId`,
  `envVars.ronakByAliUsers`, `envVars.ronakByAliBucketId`,
  `envVars.ronakByAliUrl`, and `envVars.ronakByAliProjectId`.

### Table columns from `appwrite.config.json`

The selected table has `$id` and `name` both set to `ronakbyali_users`.

| Column key | Appwrite type | Config detail |
|---|---|---|
| `name` | `string` | size 128, required |
| `email` | `string` | format `email`, required |
| `username` | `string` | size 40, required; code comments say unique |
| `phone` | `string` | size 20, optional |
| `role` | `string` | enum `admin`, `support`, `manager`, `customer`, `loyal`, `new`; default `new` |
| `avatarFileId` | `string` | size 64, optional |
| `isBlocked` | `boolean` | optional, default false |
| `lastAddress` | `string` | size 500, optional |
| `lastCity` | `string` | size 100, optional |
| `cartId` | `string` | size 36, optional |
| `wishlistId` | `string` | size 36, optional |
| `ordersCount` | `integer` | optional, default 0 |
| `totalSpent` | `double` | optional, default 0 |
| `authProvider` | `string` | enum `email`, `google`; default `email` |
| `lastLoginAt` | `datetime` | optional |
| `reviewIds` | `string` | size 36, array, optional |

### `UserService` methods and columns referenced

| Method | Signature as declared | Main behavior / columns |
|---|---|---|
| `constructor` | `constructor()` | Configures Appwrite `Client` endpoint/project; creates `TablesDB` and `Storage` clients. |
| `createProfile` | `async createProfile({ userId, data = {} })` | Creates row with `rowId: userId`; defaults `name`, `email`, `phone`, `role`, `isBlocked`, address/city, `cartId`, `wishlistId`, `ordersCount`, `totalSpent`, `authProvider`, then supplied data and generated `username`. Row permissions are user read/update/delete. Handles 409 by checking existing profile or retrying username. |
| `_createCartAndWishlist` | `async _createCartAndWishlist(profile)` | Calls cart/wishlist creation and writes `cartId` / `wishlistId` using `updateProfile`. |
| `ensureProfile` | `async ensureProfile({ user, defaults = {} })` | Looks up by user `$id`, then email; updates `lastLoginAt`; otherwise creates profile with name/email/role/lastLoginAt and defaults. |
| `getProfile` | `async getProfile({ userId })` | `getRow` by row ID; suppresses 404 logging, returns false on failure. |
| `updateProfile` | `async updateProfile({ userId, data })` | Writes supplied row data; callsites write profile columns listed here. |
| `updateOwnProfile` | `async updateOwnProfile({ userId, data = {} })` | Allows only `name`, `phone`, `lastAddress`, `lastCity`, `avatarFileId`; returns false when no allowed keys. |
| `deleteProfile` | `async deleteProfile({ userId })` | Deletes a profile row. |
| `getProfileByEmail` | `async getProfileByEmail({ email })` | Queries `email`, limit 1. |
| `getProfileByUsername` | `async getProfileByUsername({ username })` | Queries `username`, limit 1. |
| `_getOneBy` | `async _getOneBy(column, value)` | Generic `Query.equal(column, value)`, `Query.limit(1)`. |
| `toPublicProfile` | `toPublicProfile(profile)` | Returns only `{ $id, name, username, avatarFileId, role, $createdAt }`. |
| `isUsernameAvailable` | `async isUsernameAvailable(username)` | Queries `username`; returns false on error (fail closed). |
| `generateUniqueUsername` | `async generateUniqueUsername(seed, longer = false)` | Generates sanitized seed plus 4 or 6 digits; checks username availability up to eight times. |
| `computeRole` | `computeRole(currentRole, ordersCount)` | Keeps staff role; `>= 2` orders → `loyal`; `>= 1` → `customer`; otherwise `new`. |
| `applyOrderToProfile` | `async applyOrderToProfile({ profile, order })` | Updates `phone`, `lastCity`, `lastAddress`, `ordersCount`, `totalSpent`, `role`. |
| `setRole` | `async setRole({ userId, role })` | Rejects values outside `ROLES`; updates `role`. Comment says admin only. |
| `setBlocked` | `async setBlocked({ userId, isBlocked })` | Writes boolean `isBlocked`. Comment says admin only but also notes owner update permission can permit self-unblocking via direct API. |
| `getProfilesPage` | `async getProfilesPage({ role, limit = 25, offset = 0 } = {})` | Optional `role` query; descending `$createdAt`, limit, offset; returns `{ rows, total }`. |
| `getProfiles` | `async getProfiles({ role } = {})` | Loads all rows, optionally role-filtered. |
| `searchProfiles` | `async searchProfiles({ term, role } = {})` | In-memory case-insensitive search over `name`, `email`, `username`, `phone`. |
| `_getAllRows` | `async _getAllRows(extraQueries = [])` | Pages `listRows` in batches of 100 using `Query.cursorAfter`. |
| `uploadAvatar` | `async uploadAvatar({ file })` | Storage `createFile` using `ID.unique()`. |
| `deleteAvatar` | `async deleteAvatar({ fileId })` | Storage `deleteFile`. |
| `getAvatarUrl` | `getAvatarUrl({ fileId })` | Synchronous `bucket.getFileView`; returns null for no file ID/error. |
| `changeAvatar` | `async changeAvatar({ userId, file, oldFileId })` | Uploads, writes `avatarFileId`, rolls back new file on profile update failure, then deletes old file. |

Most service methods catch, `console.error(error.message)`, and return `false`
or a documented fallback. `getAvatarUrl` is the synchronous avatar URL helper
used by JSX. `createProfile` grants row-level owner read/update/delete in
addition to the table-level permissions recorded in Appwrite config.

## Appendix B. Small source files copied verbatim

These files are under 40 lines and were included in full as requested.

### `src/layouts/PlainLayout.jsx`

```jsx
import { Outlet } from "react-router";

// Public pages without the site header (everything except Home, which keeps MainLayout).
// Works both as a route layout (<Outlet />) and wrapping children (see SlugRoute).
export default function PlainLayout({ children }) {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
```

### `src/layouts/AuthLayout.jsx`

```jsx
import { Link, Outlet } from "react-router";
import { PATHS } from "../router/path";

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <Link to={PATHS.home}>Store</Link>
      <main className="auth-card">
        <Outlet />
      </main>
    </div>
  );
}
```

### `src/layouts/MainLayout.jsx`

```jsx
import { Outlet } from "react-router";

// Renders <Outlet /> by default, or `children` when used directly (SlugRoute).
export default function MainLayout({ children }) {
  return (
    <>
      <main>{children ?? <Outlet />}</main>

      <footer />
    </>
  );
}
```

### `src/layouts/AccountLayout.jsx`

```jsx
import DashboardShell from "../components/shared/DashboardShell";

// Customer dashboard: shared sidebar + content. No site header.
// Used as a route layout (Outlet) and with children (SlugRoute).
export default function AccountLayout({ children }) {
  return <DashboardShell area="user">{children}</DashboardShell>;
}
```

### `src/router/productLookup.js`

```js
// Does  /:slug  point at a real product?  (short product link, see SlugRoute)
//
// SlugRoute calls this for any single-segment URL that is not the visitor's own
// username. When it resolves to false the visitor is redirected (logged in -> their
// panel, logged out -> /welcome-back) instead of seeing an empty product page.
//
// It is not connected to the product service yet, so it answers true and the
// Product page behaves exactly as before. Connect it to your product lookup,
// e.g.  return Boolean(await productService.getProduct({ productId: slug }));
export async function productExists(slug) { // eslint-disable-line no-unused-vars
  return true;
}
```

### `src/pages/user/dashboard/Profile.jsx`

```jsx
import React from 'react'

function Profile() {
  return (
    <div>Profile</div>
  )
}

export default Profile
```

### `src/pages/user/dashboard/Overview.jsx`

```jsx
import LogoutButton from '../../shared/auth/LogoutButton';

function Overview() {
  return (
    <div className="flex items-center justify-between">
      <h1>Overview</h1>
      <LogoutButton />
    </div>
  )
}

export default Overview
```

### `src/pages/shared/structure/NotFound.jsx`

```jsx
import { Link } from "react-router";
import { PATHS } from "../../../router/path";

export default function NotFound() {
  return (
    <div>
      <h1>Page not found</h1>
      <Link to={PATHS.home}>Back to the store</Link>
    </div>
  );
}
```

### `src/pages/admin/dashboard/AdminPannel.jsx`

```jsx
import React from 'react'

function AdminPannel() {
  return (
    <div>AdminPannel</div>
  )
}

export default AdminPannel
```

### `src/pages/admin/dashboard/Alerts.jsx`

```jsx
import React from 'react'

function Alerts() {
  return (
    <div>Alerts</div>
  )
}

export default Alerts
```

### `src/pages/admin/dashboard/CartAndWishlist.jsx`

```jsx
import React from 'react'

function CartAndWishlist() {
  return (
    <div>CartAndWishlist</div>
  )
}

export default CartAndWishlist
```

### `src/pages/admin/dashboard/Finance.jsx`

```jsx
import React from 'react'

function Finance() {
  return (
    <div>Finance</div>
  )
}

export default Finance
```

### `src/pages/admin/dashboard/Orders.jsx`

```jsx
import React from 'react'

function Orders() {
  return (
    <div>Orders</div>
  )
}

export default Orders
```

### `src/pages/admin/dashboard/Overview.jsx`

```jsx
import React from 'react'

function Overview() {
  return (
    <div>Overview</div>
  )
}

export default Overview
```

### `src/pages/admin/dashboard/Settings.jsx`

```jsx
import React from 'react'

function Settings() {
  return (
    <div>Settings</div>
  )
}

export default Settings
```

### `src/pages/admin/dashboard/Users.jsx`

```jsx
import React from 'react'

function Users() {
  return (
    <div>Users</div>
  )
}

export default Users
```

### `src/store/slices/services.js`

```js
// ONE place to point at your Appwrite service files.
// Change the path below if your folder is not src/appwrite.
export {
  authService,
  userService,
  productService,
  cartService,
  wishlistService,
  orderService,
  alertService,
  settingsService,
  layoutService,
  reviewService,
} from '../../lib/appwrite';
```

### `src/store/slices/hooks.js`

```js
import { useDispatch, useSelector } from 'react-redux';

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
```

### `src/store/slices/index.js`

```text
(empty file)
```

### `src/components/shared/index.js`

```text
(empty file)
```

### `src/components/admin/products/index.js`

```js
export { default as ProductForm } from './ProductForm';
export { default as ProductTable } from './ProductTable';
export * from './productFields';
```

### `src/store/slices/utils.js`

```js
// Small helpers shared by the slices.
import { createAsyncThunk } from '@reduxjs/toolkit';

// Used as a rejection payload when a guest tries a logged-in action.
export const LOGIN_REQUIRED = 'LOGIN_REQUIRED';

// Appwrite rows are plain objects with a $id.
export const isRow = (v) =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v) && Boolean(v.$id);

// Account id used by the services ({ userId }). Falls back to the profile row id.
export const getUserId = (profile) => profile?.userId || profile?.$id || null;

// Rows from a result that may be an array or { rows }.
export const toRows = (r) => (Array.isArray(r) ? r : r?.rows || []);

// Reject with a readable message. Pass the thunk argument so `toast: true` works.
export const fail = (rejectWithValue, message, arg) =>
  rejectWithValue(message, {
    toast: Boolean(arg && typeof arg === 'object' && !Array.isArray(arg) && arg.toast),
  });

// Remove the `toast` flag before forwarding an argument object to a service.
export const stripToast = (arg) => {
  if (!arg || typeof arg !== 'object' || Array.isArray(arg)) return {};
  const { toast, ...rest } = arg; // eslint-disable-line no-unused-vars
  return rest;
};

// Generic thunk for admin methods whose exact signature is passed through.
// Call it with an ARRAY of the service arguments: dispatch(thunk([rowId, data])).
// `single: true` sends the argument as-is (useful when the argument is itself an array).
// `after(dispatch, result, args)` can reload data once the call worked.
export const serviceThunk = (type, service, method, opts = {}) => {
  const { single = false, toast = true, message, after } = opts;
  return createAsyncThunk(type, async (args, { dispatch, rejectWithValue }) => {
    const list = single ? [args] : args === undefined ? [] : Array.isArray(args) ? args : [args];
    const result = await service[method](...list);
    if (result === false) return rejectWithValue(message || `Could not ${method}.`, { toast });
    if (after) await after(dispatch, result, args);
    return result ?? true;
  });
};
```

### `src/ui/custom/button/ActionButton.jsx`

```jsx
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-alt',
  danger: 'bg-error text-white hover:opacity-90',
  ghost: 'text-muted hover:bg-surface-alt hover:text-text',
};
const SIZES = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-[0.95rem]' };

// General button for dashboards. variant: primary | secondary | danger | ghost, size: sm | md.
export default function ActionButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon size={18} aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
```

### `src/ui/custom/input/SwitchInput.jsx`

```jsx
import { useId } from 'react';

// On/off switch with a label and optional description.
export default function SwitchInput({ label, description, checked = false, onChange, disabled = false, className = '' }) {
  const id = useId();

  return (
    <div className={`flex items-start justify-between gap-4 rounded-md border border-border bg-bg px-4 py-3 ${className}`}>
      <div className="min-w-0">
        <label id={`${id}-label`} htmlFor={id} className="block cursor-pointer text-sm font-medium text-text">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border border-border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
          checked ? 'bg-accent' : 'bg-surface-alt'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-0.5 top-0.5 rounded-full bg-surface shadow-soft transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
          style={{ width: '1.125rem', height: '1.125rem' }}
        />
      </button>
    </div>
  );
}
```

### `src/ui/custom/toggles/ThemeToggle.jsx`

```jsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className="inline-grid size-10 cursor-pointer place-items-center rounded-full border border-line bg-surface text-sage-deep transition-colors hover:border-sage hover:bg-sage-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-deep"
    >
      {isDark ? (
        <Sun size={18} strokeWidth={1.7} />
      ) : (
        <Moon size={18} strokeWidth={1.7} />
      )}
    </button>
  );
}
```

### `src/pages/shared/auth/LogoutButton.jsx`

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Loader2 } from 'lucide-react';

import { useAppDispatch } from '../../../store/slices/hooks';
import { logout } from '../../../store/slices/authSlice';
import { PATHS } from '../../../router/path';

const DEFAULT_CLASS =
  'inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-60';

// Logs out (clears every user slice via isSessionEnded) and goes to the sign-in page.
// Pass `className` to restyle it, e.g. as a sidebar row.
export default function LogoutButton({ className = DEFAULT_CLASS }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onLogout = async () => {
    if (busy) return;
    setBusy(true);
    const result = await dispatch(logout());
    setBusy(false);
    if (logout.fulfilled.match(result)) {
      navigate(PATHS.signin, { replace: true });
    }
  };

  return (
    <button type="button" onClick={onLogout} disabled={busy} className={className}>
      {busy ? (
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      ) : (
        <LogOut size={18} aria-hidden="true" />
      )}
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
```

### `src/router/ProtecteRoute.jsx`

```jsx
import { Navigate, Outlet, useLocation, useParams } from "react-router";
import useSession from "./useSession";
import { PATHS } from "./path";

/**
 * Guards dashboards.  <ProtectedRoute area="user" />  or  area="admin"
 *  1. logged out -> /welcome-back (remembers where they were going)
 *  2. every person has exactly ONE panel, so anything else goes to it:
 *       staff (admin / support / manager)  -> /team/:username   (never /:username)
 *       everyone else                      -> /:username        (never /team/...)
 *  3. someone else's username in the URL -> their own panel
 */
export default function ProtectedRoute({ area = "user" }) {
  const { isReady, isLoggedIn, username, isStaff, panel } = useSession();
  const { username: urlUsername } = useParams();
  const location = useLocation();

  if (!isReady) return null;

  if (!isLoggedIn) {
    return <Navigate to={PATHS.signin} replace state={{ from: location }} />;
  }

  const wrongArea = (area === "admin") !== isStaff;
  const wrongPerson = urlUsername?.toLowerCase() !== username.toLowerCase();
  if (wrongArea || wrongPerson) {
    return <Navigate to={panel} replace />;
  }

  return <Outlet />;
}
```

### `src/router/GuestRoute.jsx`

```jsx
import { useRef } from "react";
import { Navigate, Outlet } from "react-router";
import useSession from "./useSession";

// Sign in / sign up are for logged-out people only.
//
//  - Someone who is ALREADY logged in when they open these pages (typed the URL,
//    pressed back, followed an old link) is sent to their own panel:
//    staff -> /team/:username, everyone else -> /:username.
//  - Someone who logs in or signs up ON these pages is not redirected here.
//    Signin / Signup / ProfileStep send them on themselves (staff -> admin panel,
//    customers -> /products), so the two redirects can never fight each other.
export default function GuestRoute() {
  const { isReady, isLoggedIn, panel } = useSession();
  const arrivedLoggedIn = useRef(null);

  if (!isReady) return null;
  if (arrivedLoggedIn.current === null) arrivedLoggedIn.current = isLoggedIn;

  if (isLoggedIn && arrivedLoggedIn.current) {
    return <Navigate to={panel} replace />;
  }
  return <Outlet />;
}
```

### `src/router/CatchAllRoute.jsx`

```jsx
import { Navigate, useLocation } from "react-router";
import useSession from "./useSession";
import { PATHS } from "./path";
import NotFound from "../pages/shared/structure/NotFound";

// Last route (path="*"): a URL that no route in App.jsx matches.
//  - logged in  -> their own panel (staff -> /team/:username, others -> /:username)
//  - logged out -> /welcome-back for anything under /team, the normal 404 page otherwise
export default function CatchAllRoute() {
  const { isReady, isLoggedIn, panel } = useSession();
  const location = useLocation();

  if (!isReady) return null;
  if (isLoggedIn) return <Navigate to={panel} replace />;
  if (/^\/team(\/|$)/i.test(location.pathname)) {
    return <Navigate to={PATHS.signin} replace state={{ from: location }} />;
  }
  return <NotFound />;
}
```

### `src/router/useProductId.js`

```js
import { useParams } from "react-router-dom";

// Use this inside Product.jsx. It works for both product URLs:
//   /products/:category/:group/:productId   -> params.productId
//   /:productId (short link)                -> params.username (shared segment)
export default function useProductId() {
  const { productId, username } = useParams();
  return productId ?? username;
}
```

### `src/router/useSession.js`

```js
import { useSelector } from "react-redux";
import { PATHS, dashboardHome } from "./path";

/**
 * The only place the router reads the auth slice.
 *  isAdmin = role "admin" only
 *  isStaff = admin, support or manager (they use the admin panel, /team/:username)
 *  panel   = the one dashboard this person owns:
 *            staff -> /team/:username, everyone else -> /:username
 *            (/products when there is no username yet, so redirects can never loop)
 *  canShop = false for staff. Cart, wishlist, checkout and reviews need a separate
 *            customer account (a different email), so use this to hide or block them.
 */
export default function useSession() {
  const auth = useSelector((state) => state.auth);
  const user = auth.profile;
  const isLoggedIn = Boolean(user);
  const username = user?.username || "";
  const isAdmin = auth.roleFlags.isAdmin;
  const isStaff = auth.roleFlags.isStaff;
  const isReady = auth.authChecked;
  const panel = username ? dashboardHome(username, isStaff) : PATHS.products;

  const canShop = !isStaff;

  return { user, isLoggedIn, username, isAdmin, isStaff, isReady, panel, canShop };
}
```

### Exact exports in existing store slices

| File | Exported names |
|---|---|
| `cartSlice.js` | `fetchCart`, `addToCart`, `setCartQuantity`, `removeFromCart`, `clearCart`, default reducer, `selectCartLines`, `selectCartCount`, `selectCartSubtotal`, `selectCartDeliveryCharges`, `selectCartTotal`, `selectCartStatus`, `selectCartUpdating`, `selectCartError`. |
| `ordersSlice.js` | `PAYMENT_METHODS`, `DELIVERY_TYPES`, `placeOrder`, `fetchMyOrders`, `fetchOrder`, `fetchOrderByNumber`, `clearLastPlacedOrder`, default reducer, `selectMyOrders`, `selectOrderById`, `selectMyOrdersTotal`, `selectMyOrdersStatus`, `selectMyOrdersError`, `selectCurrentOrder`, `selectOrderDetailStatus`, `selectOrderDetailError`, `selectPlaceOrderStatus`, `selectPlaceOrderError`, `selectLastPlacedOrder`, `parseOrderItems`. |
| `wishlistSlice.js` | `fetchWishlist`, `toggleWishlist`, `clearWishlist`, default reducer, `selectWishlistIds`, `selectWishlistProducts`, `selectWishlistCount`, `selectWishlistStatus`, `selectWishlistError`, `selectIsWished`. |
| `uiSlice.js` | `openLoginModal`, `closeLoginModal`, `openCartDrawer`, `closeCartDrawer`, `toggleCartDrawer`, `openMobileMenu`, `closeMobileMenu`, `openSearch`, `closeSearch`, `setTheme`, `toggleTheme`, `addToast`, `removeToast`, default reducer, `selectLoginModalOpen`, `selectCartDrawerOpen`, `selectMobileMenuOpen`, `selectSearchOpen`, `selectTheme`, `selectToasts`. |
| `productsSlice.js` | `fetchProducts`, `fetchProductBySlug`, `fetchProductById`, `fetchProductsByIds`, `fetchFeaturedProducts`, `fetchRelatedProducts`, `fetchCategories`, `fetchGroups`, `fetchCategoriesWithSample`, `fetchGroupsWithSample`, `fetchPriceRange`, `addProduct`, `updateProduct`, `deleteProduct`, `updateStock`, `updateProductOrder`, `addImages`, `removeImage`, `setMainImage`, `generateUniqueSlug`, `setProductFilters`, `resetProductFilters`, `clearProductDetail`, default reducer, `selectProductsList`, `selectFeaturedProducts`, `selectRelatedProducts`, `selectProductDetail`, `selectProductEntityById`, `selectProductFilters`, `selectProductsTotal`, `selectProductsHasMore`, `selectProductsPage`, `selectProductsStatus`, `selectProductsError`, `selectFeaturedStatus`, `selectRelatedStatus`, `selectProductDetailStatus`, `selectProductDetailError`, `selectCategories`, `selectGroups`, `selectCategoriesWithSample`, `selectGroupsWithSample`, `selectPriceRange`, `selectProductAdminStatus`, `selectProductAdminError`, `getMainImageUrl`, `getProductImageUrls`, `getProductImageUrl`. |

`src/store/slices/utils.js` exports `LOGIN_REQUIRED`, `isRow`, `getUserId`,
`toRows`, `fail`, `stripToast`, `serviceThunk`. `services.js` re-exports
`authService`, `userService`, `productService`, `cartService`, `wishlistService`,
`orderService`, `alertService`, `settingsService`, `layoutService`, and
`reviewService`. `hooks.js` exports `useAppDispatch` and `useAppSelector`.
