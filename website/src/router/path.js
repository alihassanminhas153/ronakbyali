// Single source of truth for every URL. Always build links with these helpers.
const e = encodeURIComponent;

export const PATHS = {
  home: "/",

  // accounts
  signin: "/welcome-back",
  signup: "/create-account",

  // products
  products: "/products",
  productShort: (productId) => `/${e(productId)}`,
  product: (category, group, productId) =>
    `/products/${e(category)}/${e(group)}/${e(productId)}`,

  // user dashboard  ->  /:username/...
  user: {
    overview: (u) => `/${e(u)}`,
    profile: (u) => `/${e(u)}/profile`,
    orders: (u) => `/${e(u)}/orders`,
    cart: (u) => `/${e(u)}/cart`,
    wishlist: (u) => `/${e(u)}/wishlist`,
    reviews: (u) => `/${e(u)}/reviews`,
    alerts: (u) => `/${e(u)}/alerts`,
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
  },
};

// A person's own dashboard: the admin panel for staff (admin, support,
// manager), the user dashboard for everyone else. Not the post-login landing
// page: that is homePathFor() in pages/shared/account/authRedirect.js.
export const dashboardHome = (username, isStaff) =>
  isStaff ? PATHS.admin.overview(username) : PATHS.user.overview(username);

// These can never be usernames, because they are real top-level URLs.
export const RESERVED_USERNAMES = [
  "products",
  "team",
  "auth",
  "welcome-back",
  "create-account",
];