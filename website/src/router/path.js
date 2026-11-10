// Single source of truth for every URL. Always build links with these helpers.
const e = encodeURIComponent;

// Customer dashboards live at /@username. Staff use /team/username (no @).
// The router sees the whole first segment ("@ali") as the :username param, because
// React Router cannot match a partial segment such as "@:username".
export const stripAt = (value = "") => (String(value).startsWith("@") ? String(value).slice(1) : String(value));
export const isHandle = (value = "") => String(value).startsWith("@");
const at = (u) => `/@${e(stripAt(u))}`;

// Every spelling that redirects to /products. Lowercase only: React Router
// matching ignores case, so "allProducts" is covered by "allproducts".
export const PRODUCT_LIST_ALIASES = [
  "product",
  "allproducts",
  "all-products",
  "all_products",
  "all",
  "shop",
];

export const PATHS = {
  home: "/",

  // accounts
  signin: "/welcome-back",
  signup: "/create-account",

  // products
  products: "/products",
  productShort: (productId) => `/${e(productId)}`,
  product: (category, group, productId) =>
    `/${e(category)}/${e(group)}/${e(productId)}`,

  // user dashboard  ->  /@username/...
  user: {
    overview: (u) => `${at(u)}`,
    profile: (u) => `${at(u)}/profile`,
    orders: (u) => `${at(u)}/orders`,
    cart: (u) => `${at(u)}/cart`,
    wishlist: (u) => `${at(u)}/wishlist`,
    reviews: (u) => `${at(u)}/reviews`,
    alerts: (u) => `${at(u)}/alerts`,
  },

  // admin dashboard  ->  /team/:username/...
  admin: {
    overview: (u) => `/team/${e(u)}`,
    orders: (u) => `/team/${e(u)}/orders`,
    products: (u) => `/team/${e(u)}/products`,
    users: (u) => `/team/${e(u)}/users`,
    finance: (u) => `/team/${e(u)}/finance`,
    cartAndWishlist: (u) => `/team/${e(u)}/cart-and-wishlist`,
    alerts: (u) => `/team/${e(u)}/alerts`,
    settings: (u) => `/team/${e(u)}/settings`,
    reviews: (u) => `/team/${e(u)}/reviews`,
  },
};

export const dashboardHome = (username, isStaff) =>
  isStaff ? PATHS.admin.overview(username) : PATHS.user.overview(username);

// These can never be usernames, because they are real top-level URLs.
// The product-list aliases are included so a user named "shop" can't be
// hidden behind the redirect.
export const RESERVED_USERNAMES = [
  "products",
  "team",
  "auth",
  "welcome-back",
  "create-account",
  ...PRODUCT_LIST_ALIASES,
];