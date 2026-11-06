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