import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import { initAuth } from "./store/slices/authSlice";
import { fetchCart } from "./store/slices/cartSlice";
import { fetchWishlist } from "./store/slices/wishlistSlice";

// layouts & guards
import MainLayout from "./layouts/MainLayout";
import PlainLayout from "./layouts/PlainLayout";
import AuthLayout from "./layouts/AuthLayout";
import AccountLayout from "./layouts/AccountLayout";
import BlockedGate from "./router/BlockedGate";
import GuestRoute from "./router/GuestRoute";
import ProtectedRoute from "./router/ProtecteRoute";
import SlugRoute from "./router/SlugRoute";
import CatchAllRoute from "./router/CatchAllRoute";
import RedirectRoute from "./router/RedirectRoute";
import { PATHS, PRODUCT_LIST_ALIASES } from "./router/path";
import ToastViewport from "./ui/custom/toast/ToastViewport";

// shared pages
import Home from "./pages/shared/structure/Home";
import AllProducts from "./pages/shared/products/AllProducts";
import Product from "./pages/shared/products/Product";
import Signin from "./pages/shared/account/Signin";
import Signup from "./pages/shared/account/Signup";
import AuthCallback from "./pages/shared/account/AuthCallback";

// user dashboard
import UserProfile from "./pages/user/dashboard/Profile";
import UserOrders from "./pages/user/dashboard/Orders";
import UserCart from "./pages/user/dashboard/Cart";
import UserCheckout from "./pages/user/dashboard/CheckoutPage";
import UserWishlist from "./pages/user/dashboard/Wishlist";
import UserReviews from "./pages/user/dashboard/Reviews";
import UserAlerts from "./pages/user/dashboard/Alerts";

// admin dashboard
import AdminLayout from "./pages/admin/dashboard/Layout";
import AdminOverview from "./pages/admin/dashboard/Overview";
import AdminOrders from "./pages/admin/dashboard/Orders";
import AdminProducts from "./pages/admin/dashboard/Products";
import AdminUsers from "./pages/admin/dashboard/Users";
import AdminFinance from "./pages/admin/dashboard/Finance";
import AdminCartAndWishlist from "./pages/admin/dashboard/CartAndWishlist";
import AdminReviews from "./pages/admin/dashboard/Reviews";
import AdminAlerts from "./pages/admin/dashboard/Alerts";
import AdminSettings from "./pages/admin/dashboard/Settings";
import Contact from "./pages/static/Contact";
import Privacy from "./pages/static/Privacy";
import FAQs from "./pages/static/FAQs";

const SITE_PAGES = [
  { name: "Shop", link: PATHS.products },
  { name: "Contact", link: PATHS.contact },
  { name: "Privacy", link: PATHS.privacy },
  { name: "FAQs", link: PATHS.faqs },
];

const STATIC_PAGE_TITLES = {
  "/": "Home",
  "/products": "Shop",
  "/contact": "Contact",
  "/privacy": "Privacy Policy",
  "/faqs": "FAQs",
  "/welcome-back": "Sign In",
  "/create-account": "Create Account",
  "/auth/callback": "Signing In",
};

export default function App() {
  const dispatch = useDispatch();
  const profileId = useSelector((s) => s.auth.profile?.$id);
  const { pathname } = useLocation();

  useEffect(() => {
    const route = pathname.replace(/\/+$/, "") || "/";
    const pageTitle = STATIC_PAGE_TITLES[route];
    if (pageTitle) document.title = `${pageTitle} | Ronak By Ali`;
  }, [pathname]);

  // Restore the profile before route guards decide where to send the visitor.
  // (BlockedGate then loads the same account into the users slice, see useProfileSync.)
  useEffect(() => {
    dispatch(initAuth());
  }, [dispatch]);

  // Once a user is signed in, load their cart and wishlist so the cart badge,
  // the heart buttons and the product page know what they already have.
  // Logging out clears both slices (isSessionEnded), so nothing to do here for that.
  useEffect(() => {
    if (!profileId) return;
    dispatch(fetchCart());
    dispatch(fetchWishlist());
  }, [dispatch, profileId]);

  return (
    <>
    <ToastViewport />
    <Routes>
      {/* Pathless layout route ABOVE every other route: a blocked user sees only the
          Blocked page, whatever URL they type. */}
      <Route element={<BlockedGate />}>
        {/* ---------- Home: the only page that keeps the site header ---------- */}
        <Route element={<MainLayout pages={SITE_PAGES} />}>
          <Route index element={<Home />} />                                   {/* /  */}
        </Route>

        {/* ---------- Product list: /products. Every other spelling redirects to it ----------
            (product, allProducts, all-products ... see PRODUCT_LIST_ALIASES in path.js.
            Matching ignores case, and ?q=&category= style filters are carried over.) */}
        {PRODUCT_LIST_ALIASES.map((alias) => (
          <Route key={alias} path={alias} element={<RedirectRoute to={PATHS.products} />} />
        ))}
        {/* old long link /products/:category/:group/:productId -> the new form */}
        <Route
          path="products/:category/:group/:productId"
          element={<RedirectRoute to={(p) => PATHS.product(p.category, p.group, p.productId)} />}
        />

        <Route path="products" element={<AllProducts pages={SITE_PAGES} />} /> {/* /products */}

        {/* ---------- Public pages ---------- */}
        <Route element={<PlainLayout pages={SITE_PAGES} />}>
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="faqs" element={<FAQs />} />
          {/* One product: /:category/:group/:productId (productId is the slug).
              The short form /:productId is resolved by SlugRoute below, next to /:username. */}
          <Route path=":category/:group/:productId" element={<Product />} />
          {/* Unknown /team/... URLs must not be mistaken for a product link. */}
          <Route path="team/:username/*" element={<CatchAllRoute />} />
          <Route path="*" element={<CatchAllRoute />} />        {/* unknown URL */}
        </Route>

        {/* ---------- Accounts ---------- */}
        {/* Google sends people back here. Standalone and OUTSIDE GuestRoute so the page
            is not redirected away while completeLogin is still creating/loading the profile. */}
        <Route path="auth/callback" element={<AuthCallback />} />

        {/* logged-out only */}
        <Route element={<AuthLayout />}>
          <Route element={<GuestRoute />}>
            <Route path="create-account" element={<Signup />} />
            <Route path="welcome-back" element={<Signin />} />
          </Route>
        </Route>

        {/* ---------- Admin panel (admin, support, manager): /team/:username/... ---------- */}
        <Route path="team/:username" element={<ProtectedRoute area="admin" />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="cart-and-wishlist" element={<AdminCartAndWishlist />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="alerts" element={<AdminAlerts />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* ---------- User: /:username/...  (and short product /:productId) ---------- */}
        <Route path=":username">
          {/* /:something -> own overview if it's your username, else short product link */}
          <Route index element={<SlugRoute />} />

          <Route element={<ProtectedRoute area="user" />}>
            <Route element={<AccountLayout />}>
              <Route path="profile" element={<UserProfile />} />
              <Route path="orders" element={<UserOrders />} />
              <Route path="cart" element={<UserCart />} />
              <Route path="checkout" element={<UserCheckout />} />
              <Route path="wishlist" element={<UserWishlist />} />
              <Route path="reviews" element={<UserReviews />} />
              <Route path="alerts" element={<UserAlerts />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
    </>
  );
}