import { Navigate, Outlet, useLocation } from "react-router";
import useSession from "./useSession";
import { dashboardHome } from "./path";

// Sign in / sign up are for logged-out people only.
export default function GuestRoute() {
  const { isReady, isLoggedIn, username, isAdmin } = useSession();
  const location = useLocation();

  if (!isReady) return null;
  if (isLoggedIn) {
    const to = location.state?.from?.pathname || dashboardHome(username, isAdmin);
    return <Navigate to={to} replace />;
  }
  return <Outlet />;
}