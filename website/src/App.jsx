import { useEffect, useLayoutEffect, useState } from "react";
import { Routes, Route, useLocation, useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import { initAuth } from "./store/slices/authSlice";
import { fetchCart } from "./store/slices/cartSlice";
import { fetchWishlist } from "./store/slices/wishlistSlice";
import { fetchSales, selectSalesStatus } from "./store/slices/saleSlice";

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
import RouteErrorBoundary from "./router/RouteErrorBoundary";
import { PATHS, PRODUCT_LIST_ALIASES } from "./router/path";
import NotFound from "./pages/shared/structure/NotFound";
import ToastViewport from "./ui/custom/toast/ToastViewport";

// shared pages
import Home from "./pages/shared/structure/Home";
import AllProducts from "./pages/shared/products/AllProducts";
import Product from "./pages/shared/products/Product";
import CustomizeCheckout from "./pages/shared/products/CustomizeCheckout";
import Signin from "./pages/shared/account/Signin";
import Signup from "./pages/shared/account/Signup";
import AuthCallback from "./pages/shared/account/AuthCallback";

// user dashboard
import UserProfile from "./pages/user/dashboard/Profile";
import UserOrders from "./pages/user/dashboard/Orders";
import UserCart from "./pages/user/dashboard/Cart";
import UserCheckout from "./pages/user/dashboard/CheckoutPage";
import ConfirmOrder from "./pages/user/dashboard/ConfirmOrder";
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
import Disclaimer from "./pages/static/Disclaimer";
import FAQs from "./pages/static/FAQs";
import CustomStudioPage from "./pages/static/CustomStudio";

const SITE_PAGES = [
  { name: "Shop", link: PATHS.products },
  { name: "Contact", link: PATHS.contact },
  { name: "Privacy", link: PATHS.privacy },
  { name: "Custom", link: PATHS.customStudio },
  { name: "FAQs", link: PATHS.faqs },
];

const STATIC_PAGE_TITLES = {
  "/": "Home",
  "/products": "Shop",
  "/p/contact": "Contact",
  "/p/privacy": "Privacy Policy",
  "/p/disclaimer": "Disclaimer",
  "/p/faqs": "FAQs",
  "/p/custom-studio": "Custom Studio",
  "/welcome-back": "Sign In",
  "/create-account": "Create Account",
  "/auth/callback": "Signing In",
};

function ShortProductRoute() {
  const { productSlug } = useParams();
  return (
    <PlainLayout pages={SITE_PAGES} showOffers>
      <Product slug={productSlug} />
    </PlainLayout>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const profileId = useSelector((s) => s.auth.profile?.$id);
  const salesStatus = useSelector(selectSalesStatus);
  const { pathname } = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const route = pathname.replace(/\/+$/, "") || "/";
    const pageTitle = STATIC_PAGE_TITLES[route];
    if (pageTitle === "Home") document.title = "Ronak By Ali | Handmade & Custom Products"
    if (pageTitle !== "Home") document.title = `${pageTitle} | Ronak By Ali`;
  }, [pathname]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const route = pathname.replace(/\/+$/, "") || "/";
    if (["/", "/welcome-back", "/create-account", "/auth/callback"].includes(route)) {
      setIsNavigating(false);
      return undefined;
    }

    setIsNavigating(true);
    const id = window.setTimeout(() => setIsNavigating(false), 220);
    return () => window.clearTimeout(id);
  }, [pathname]);

  // Restore the profile before route guards decide where to send the visitor.
  // (BlockedGate then loads the same account into the users slice, see useProfileSync.)
  useEffect(() => {
    dispatch(initAuth());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchSales());
  }, [dispatch]);

  // Load wishlist data as soon as the signed-in profile is available.
  useEffect(() => {
    if (!profileId) return;
    dispatch(fetchWishlist());
  }, [dispatch, profileId]);

  // Wait for sale dates before refreshing cart prices and delivery totals.
  useEffect(() => {
    if (!profileId || salesStatus === "idle" || salesStatus === "loading") return;
    dispatch(fetchCart());
  }, [dispatch, profileId, salesStatus]);

  return (
    <>
    {isNavigating && (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-bg/65 backdrop-blur-sm">
        <div className="flex items-center gap-3 rounded-full border border-border bg-surface/95 px-4 py-2.5 shadow-soft">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
          <span className="text-sm font-medium text-text">Loading page…</span>
        </div>
      </div>
    )}
    <ToastViewport />
    <RouteErrorBoundary>
    <Routes>
      {/* Pathless layout route ABOVE every other route: blocked users may see Home;
          every other URL is replaced by the Blocked page. */}
      <Route element={<BlockedGate />}>
        {/* ---------- Home: the only page that keeps the site header ---------- */}
        <Route element={<MainLayout pages={SITE_PAGES} />}>
          <Route index element={<Home />} />                                   {/* /  */}
        </Route>

        {/* Legacy storefront URLs and static-page shortcuts. */}
        {PRODUCT_LIST_ALIASES.map((alias) => (
          <Route key={alias} path={alias} element={<RedirectRoute to={PATHS.products} />} />
        ))}
        <Route path="products" element={<AllProducts pages={SITE_PAGES} />} />
        <Route path="contact" element={<RedirectRoute to={PATHS.contact} />} />
        <Route path="privacy" element={<RedirectRoute to={PATHS.privacy} />} />
        <Route path="disclaimer" element={<RedirectRoute to={PATHS.disclaimer} />} />
        <Route path="faqs" element={<RedirectRoute to={PATHS.faqs} />} />
        <Route path="custom-studio" element={<RedirectRoute to={PATHS.customStudio} />} />
        <Route path="products/:category/:group/:productId" element={<RedirectRoute to={(p) => PATHS.product(p.category, p.group, p.productId)} />} />
        <Route element={<PlainLayout pages={SITE_PAGES} showOffers />}>
          <Route path="customize/:slug" element={<CustomizeCheckout />} />
          <Route path=":category/:group/:productId" element={<Product />} />
        </Route>

        <Route path="p">
          <Route path="products" element={<RedirectRoute to={PATHS.products} />} />
          <Route path="customize/:slug" element={<RedirectRoute to={(p) => PATHS.customize(p.slug)} />} />
          <Route path=":category/:group/:productId" element={<RedirectRoute to={(p) => PATHS.product(p.category, p.group, p.productId)} />} />
          <Route element={<PlainLayout pages={SITE_PAGES} />}>
            <Route path="contact" element={<Contact />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="disclaimer" element={<Disclaimer />} />
            <Route path="faqs" element={<FAQs />} />
            <Route path="custom-studio" element={<CustomStudioPage />} />
            <Route path="team/:username/*" element={<CatchAllRoute />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<AuthLayout />}>
            <Route element={<GuestRoute />}>
              <Route path="create-account" element={<Signup />} />
              <Route path="welcome-back" element={<Signin />} />
            </Route>
          </Route>

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

          <Route path=":username">
            <Route index element={<SlugRoute />} />
            <Route element={<ProtectedRoute area="user" />}>
              <Route element={<AccountLayout />}>
                <Route path="profile" element={<UserProfile />} />
                <Route path="orders" element={<UserOrders />} />
                <Route path="cart" element={<UserCart />} />
                <Route path="checkout" element={<UserCheckout />} />
                <Route path="confirm-order" element={<ConfirmOrder />} />
                <Route path="wishlist" element={<UserWishlist />} />
                <Route path="reviews" element={<UserReviews />} />
                <Route path="alerts" element={<UserAlerts />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="auth/callback" element={<AuthCallback />} />

        <Route element={<AuthLayout />}>
          <Route element={<GuestRoute />}>
            <Route path="create-account" element={<Signup />} />
            <Route path="welcome-back" element={<Signin />} />
          </Route>
        </Route>

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

        <Route path=":username">
          <Route index element={<ShortProductRoute />} />
          <Route element={<ProtectedRoute area="user" />}>
            <Route element={<AccountLayout />}>
              <Route path="profile" element={<UserProfile />} />
              <Route path="orders" element={<UserOrders />} />
              <Route path="cart" element={<UserCart />} />
              <Route path="checkout" element={<UserCheckout />} />
              <Route path="confirm-order" element={<ConfirmOrder />} />
              <Route path="wishlist" element={<UserWishlist />} />
              <Route path="reviews" element={<UserReviews />} />
              <Route path="alerts" element={<UserAlerts />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </RouteErrorBoundary>
    </>
  );
}