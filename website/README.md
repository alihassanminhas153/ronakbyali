# Ronak By Ali

Ronak By Ali is a React single-page storefront for ready-made and customizable
products, with customer accounts and an admin dashboard. Appwrite provides
authentication, database tables, file storage, and server-side functions.

## Features

- Public home, product catalogue, product details, custom studio, FAQs, privacy,
  disclaimer, and contact pages.
- Product search/filtering, sales pricing, cart, wishlist, and product reviews.
- Email/password and Google sign-in, customer profiles, order history, tracking,
  alerts, and order confirmation.
- Custom orders with option selections and optional reference-file uploads.
- Staff tools for products, orders, customers, reviews, alerts, team access, and
  finance.
- Light/dark theme that follows the system preference until the user chooses a
  theme; the choice is saved in local storage.

## Technology

- React 19 and Vite
- React Router for URL routing and route guards
- Redux Toolkit for shared application state
- Appwrite for auth, database, storage, and functions
- Tailwind CSS 4 for styling

## Reference material

Project notes, prompts, schema and design documentation, and the generated file
structure are kept in the root `extras/` folder. The `README.md` stays at the
project root as the main setup and usage guide.

## Run locally

1. Install Node.js and npm.
2. Install dependencies with `npm install`.
3. Create a local `.env` file using `.env.sample` as a template and fill in the
   Appwrite project, database, bucket, table, and function IDs.
4. Configure the Appwrite project: create the required tables and columns,
   storage bucket, permissions, email/password authentication, Google OAuth
   redirect URLs, and the functions used by order confirmation and team access.
5. Start the development server with `npm run dev`.

Useful checks:

```sh
npm run lint
npm run build
npm run preview
```

`npm run build` creates the production site in `dist/`; `npm run preview` serves
that build locally. Optional blocked-page support links use
`VITE_SUPPORT_EMAIL` and `VITE_SUPPORT_PHONE`.

## Application startup and routing

`src/main.jsx` mounts the app with Redux, the theme provider, and browser
routing. `src/App.jsx` restores the authentication session, loads shared sales
data, and defines the route tree and page layouts.

The main route groups are:

- `/` and `/products` for the public storefront.
- `/:slug` and `/:category/:group/:slug` for product pages.
- `/welcome-back` and `/create-account` for sign-in and registration, with an
  auth callback route for OAuth.
- `/p/@username/...` for customer account pages.
- `/p/team/:username/...` for staff dashboard pages.
- `/p/contact`, `/p/privacy`, `/p/disclaimer`, `/p/faqs`, and
  `/p/custom-studio` for information and custom-studio pages.

`src/router/BlockedGate.jsx` wraps the route tree. Blocked signed-in users can
visit the public home page; other routes show the blocked page. Protected
customer and staff pages use route guards to enforce sign-in and the correct
account area.

## State and service layers

- `src/store/store.js` combines Redux slices for authentication, users, products,
  orders, cart, wishlist, sales, reviews, alerts, and UI state.
- `src/store/slices/` contains the state transitions and async thunks used by
  pages and components.
- `src/lib/appwrite/` contains the Appwrite service classes. `env/var.js` reads
  project IDs and table/bucket/function IDs from environment variables.
- `src/pages/` contains route-level screens; `src/components/` contains reusable
  feature components; `src/ui/` contains shared controls, graphics, and charts.
- `src/context/ThemeContext.jsx` provides the app-wide theme state.

## Main customer and order flows

### Browsing and checkout

Product pages load product and sale data through the product and sales services.
Customers can order a product directly or add products to a cart. Checkout
validates contact and delivery details before submitting an order.

Guests can continue through email/password authentication: an existing account
is signed in, while a new account is created before the order is placed. Google
checkout stores a temporary checkout draft and resumes after the OAuth callback.
Cart checkout is available to signed-in customers.

### Custom orders

The custom checkout collects selected product options and customer details, and
can upload reference files to the Appwrite bucket. The order service creates the
order; the custom-order service records the associated customization request.

### Order, tracking, and confirmation

`src/store/slices/ordersSlice.js` routes order actions to the order services.
Order creation attempts to create a tracker row and update related customer
data. Tracker creation is a separate side effect, so it can fail without
rolling back the order.

Customer confirmation is handled through the configured Appwrite notifier
function. Staff confirmation uses the order and confirmation services, which
update the order and maintain confirmation/tracking information.

### Admin and finance

The staff dashboard provides product and order management, customer and team
tools, reviews, alerts, settings, and finance views. Finance calculations use
payment status: unpaid orders contribute no collected payment, while paid and
partial orders contribute their paid amount. COD orders are marked paid when
staff marks them delivered.

## Environment and deployment notes

Use `.env.sample` as the list of required `RONAK_BY_ALI_*` Appwrite variables.
Vite is configured to expose both `RONAK_BY_ALI_*` and `VITE_*` variables to the
client bundle. Only put public project identifiers and client-safe settings in
these variables; never put server API keys or secrets in a frontend environment
file. Configure server-only secrets in the relevant Appwrite Function settings.

The local `.env` and `appwrite.config.json` are ignored by Git. Ensure the
production hosting environment has the required client variables and that the
deployed Appwrite tables, permissions, bucket, OAuth redirects, and functions
match the app's configuration.
