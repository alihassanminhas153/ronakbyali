import { useEffect } from "react";
import { Routes, Route } from "react-router";
import { useDispatch } from "react-redux";

import { initAuth } from "./store/slices/authSlice";

// layouts & guards
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import AccountLayout from "./layouts/AccountLayout";
import GuestRoute from "./router/GuestRoute";
import ProtectedRoute from "./router/ProtecteRoute";
import SlugRoute from "./router/SlugRoute";

// shared pages
import Home from "./pages/shared/structure/Home";
import NotFound from "./pages/shared/structure/NotFound";
import AllProducts from "./pages/shared/products/AllProducts";
import Product from "./pages/shared/products/Product";
import Signin from "./pages/shared/account/Signin";
import Signup from "./pages/shared/account/Signup";

// user dashboard
import UserProfile from "./pages/user/dashboard/Profile";
import UserOrders from "./pages/user/dashboard/Orders";
import UserCart from "./pages/user/dashboard/Cart";
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
import AdminAlerts from "./pages/admin/dashboard/Alerts";
import AdminSettings from "./pages/admin/dashboard/Settings";

export default function App() {
  const dispatch = useDispatch();

  // Restore the profile before route guards decide where to send the visitor.
  useEffect(() => {
    dispatch(initAuth());
  }, [dispatch]);

  return (
      <Routes>
        {/* ---------- Public: anyone can browse ---------- */}
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />                                   {/* /  */}
          <Route path="products" element={<AllProducts />} />                  {/* /products */}
          <Route
            path="products/:category/:group/:productId"
            element={<Product />}                                              /* long product URL */
          />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ---------- Accounts (logged-out only) ---------- */}
        <Route element={<AuthLayout />}>
          <Route element={<GuestRoute />}>
            <Route path="create-account" element={<Signup />} />
            <Route path="welcome-back" element={<Signin />} />
          </Route>
        </Route>

        {/* ---------- Admin: /team/:username/... ---------- */}
        <Route path="team/:username" element={<ProtectedRoute area="admin" />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="cart-and-wishlist" element={<AdminCartAndWishlist />} />
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
              <Route path="wishlist" element={<UserWishlist />} />
              <Route path="reviews" element={<UserReviews />} />
              <Route path="alerts" element={<UserAlerts />} />
            </Route>
          </Route>
        </Route>
      </Routes>
  );
}