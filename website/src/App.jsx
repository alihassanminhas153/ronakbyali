import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Navigate, Routes, Route, useLocation, useParams } from "react-router";
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
import useScrollLock from "./ui/custom/motion/useScrollLock";

// Route pages load only when visited, keeping the initial storefront bundle small.
const Home = lazy(() => import("./pages/shared/structure/Home"));
const AllProducts = lazy(() => import("./pages/shared/products/AllProducts"));
const Product = lazy(() => import("./pages/shared/products/Product"));
const CustomizeCheckout = lazy(() => import("./pages/shared/products/CustomizeCheckout"));
const Signin = lazy(() => import("./pages/shared/account/Signin"));
const Signup = lazy(() => import("./pages/shared/account/Signup"));
const AuthCallback = lazy(() => import("./pages/shared/account/AuthCallback"));
const UserProfile = lazy(() => import("./pages/user/dashboard/Profile"));
const UserOrders = lazy(() => import("./pages/user/dashboard/Orders"));
const UserCart = lazy(() => import("./pages/user/dashboard/Cart"));
const UserCheckout = lazy(() => import("./pages/user/dashboard/CheckoutPage"));
const ConfirmOrder = lazy(() => import("./pages/user/dashboard/ConfirmOrder"));
const UserWishlist = lazy(() => import("./pages/user/dashboard/Wishlist"));
const UserReviews = lazy(() => import("./pages/user/dashboard/Reviews"));
const UserAlerts = lazy(() => import("./pages/user/dashboard/Alerts"));
const AdminLayout = lazy(() => import("./pages/admin/dashboard/Layout"));
const AdminOverview = lazy(() => import("./pages/admin/dashboard/Overview"));
const AdminOrders = lazy(() => import("./pages/admin/dashboard/Orders"));
const AdminProducts = lazy(() => import("./pages/admin/dashboard/Products"));
const AdminInventory = lazy(() => import("./pages/admin/dashboard/Inventory"));
const AdminUsers = lazy(() => import("./pages/admin/dashboard/Users"));
const AdminFinance = lazy(() => import("./pages/admin/dashboard/Finance"));
const AdminCartAndWishlist = lazy(() => import("./pages/admin/dashboard/CartAndWishlist"));
const AdminReviews = lazy(() => import("./pages/admin/dashboard/Reviews"));
const AdminAlerts = lazy(() => import("./pages/admin/dashboard/Alerts"));
const AdminSettings = lazy(() => import("./pages/admin/dashboard/Settings"));
const Contact = lazy(() => import("./pages/static/Contact"));
const Privacy = lazy(() => import("./pages/static/Privacy"));
const Disclaimer = lazy(() => import("./pages/static/Disclaimer"));
const FAQs = lazy(() => import("./pages/static/FAQs"));
const CustomStudioPage = lazy(() => import("./pages/static/CustomStudio"));

const SITE_URL = "https://ronakbyali.com";

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

const LEGACY_ADMIN_ROUTES = [
  ["", "overview"],
  ["orders", "orders"],
  ["products", "products"],
  ["users", "users"],
  ["finance", "finance"],
  ["cart-and-wishlist", "cartAndWishlist"],
  ["reviews", "reviews"],
  ["alerts", "alerts"],
  ["settings", "settings"],
];

const LEGACY_USER_ROUTES = [
  ["profile", "profile"],
  ["orders", "orders"],
  ["cart", "cart"],
  ["checkout", "checkout"],
  ["confirm-order", "confirmOrder"],
  ["wishlist", "wishlist"],
  ["reviews", "reviews"],
  ["alerts", "alerts"],
];

function PageChunkFallback() {
  useScrollLock(true);
  return (
    <div role="status" aria-busy="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-bg/65 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-full border border-border bg-surface/95 px-4 py-2.5 shadow-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
        <span className="text-sm font-medium text-text">Loading page…</span>
      </div>
    </div>
  );
}

function LongProductRoute() {
  const { category = "" } = useParams();
  if (category.toLowerCase() === "p") return <NotFound />;
  return <Product />;
}

function RootSlugRoute() {
  const { productSlug = "" } = useParams();
  if (productSlug.toLowerCase() === "p") return <NotFound />;
  if (productSlug.startsWith("@")) {
    return <Navigate to={PATHS.user.overview(productSlug)} replace />;
  }
  return <Product slug={productSlug} />;
}

export default function App() {
  const dispatch = useDispatch();
  const profileId = useSelector((s) => s.auth.profile?.$id);
  const salesStatus = useSelector(selectSalesStatus);
  const { pathname } = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  useScrollLock(isNavigating);

  useEffect(() => {
    const route = pathname.replace(/\/+$/, "") || "/";
    const pageTitle = STATIC_PAGE_TITLES[route];
    // if (pageTitle === "Home") document.title = "Ronak By Ali | Handmade & Custom Products"
    // if (pageTitle !== "Home") document.title = `${pageTitle} | Ronak By Ali`;
    switch (pageTitle) {
      case undefined:
        document.title = "Ronak By Ali"
        break;
      case "Home":
        document.title = "Ronak By Ali | Handmade & Custom Products"
        break;
      default:
        document.title = `${pageTitle} | Ronak By Ali`
        break;
    }
  }, [pathname]);

  // Keep the canonical URL and og:url in sync with the current page.
  useEffect(() => {
    const route = pathname.replace(/\/+$/, "") || "/";
    const url = `${SITE_URL}${route}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute("content", url);
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
      <div role="status" aria-busy="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-bg/65 backdrop-blur-sm">
        <div className="flex items-center gap-3 rounded-full border border-border bg-surface/95 px-4 py-2.5 shadow-soft">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
          <span className="text-sm font-medium text-text">Loading page…</span>
        </div>
      </div>
    )}
    <ToastViewport />
    <RouteErrorBoundary>
    <Suspense fallback={isNavigating ? null : <PageChunkFallback />}>
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
        <Route path="products/:productSlug" element={<RedirectRoute to={(p) => PATHS.productShort(p.productSlug)} />} />
        <Route path="products/:category/:group/:productId" element={<RedirectRoute to={(p) => PATHS.product(p.category, p.group, p.productId)} />} />
        <Route element={<PlainLayout pages={SITE_PAGES} showOffers />}>
          <Route path="customize/:slug" element={<CustomizeCheckout />} />
          <Route path=":category/:group/:productId" element={<LongProductRoute />} />
          <Route path=":productSlug" element={<RootSlugRoute />} />
        </Route>

        <Route path="p">
          <Route path="products" element={<RedirectRoute to={PATHS.products} />} />
          <Route element={<PlainLayout pages={SITE_PAGES} smoothScroll />}>
            <Route index element={<NotFound />} />
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
              <Route path="inventory" element={<AdminInventory />} />
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

        {LEGACY_ADMIN_ROUTES.map(([suffix, page]) => (
          <Route
            key={`legacy-admin-${page}`}
            path={`team/:username${suffix ? `/${suffix}` : ""}`}
            element={<RedirectRoute to={(p) => PATHS.admin[page](p.username)} />}
          />
        ))}
        <Route path="team/:username/*" element={<NotFound />} />
        {LEGACY_USER_ROUTES.map(([suffix, page]) => (
          <Route
            key={`legacy-user-${page}`}
            path={`:username/${suffix}`}
            element={<RedirectRoute to={(p) => PATHS.user[page](p.username)} />}
          />
        ))}

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
    </RouteErrorBoundary>
    </>
  );
}