import { Navigate, Outlet, useLocation, useParams } from "react-router";
import useSession from "./useSession";
import { PATHS, stripAt } from "./path";

/**
 * Guards dashboards.  <ProtectedRoute area="user" />  or  area="admin"
 *  1. logged out -> /welcome-back (remembers where they were going)
 *  2. every person has exactly ONE panel, so anything else goes to it:
 *       staff (admin / support / manager)  -> /team/:username   (never /@username)
 *       everyone else                      -> /@username        (never /team/...)
 *  3. someone else's username in the URL -> their own panel
 *  4. an old customer link without the @ (/ali/orders) is rewritten to /@ali/orders
 *     The :username param of customer routes includes the "@" (React Router cannot match "@:username").
 */
export default function ProtectedRoute({ area = "user" }) {
  const { isReady, isLoggedIn, username, isStaff, panel } = useSession();
  const { username: urlUsername } = useParams();
  const location = useLocation();

  if (!isReady) return null;

  if (!isLoggedIn) {
    return <Navigate to={PATHS.signin} replace state={{ from: location }} />;
  }

  const rawName = urlUsername || "";
  const wrongArea = (area === "admin") !== isStaff;
  const wrongPerson = stripAt(rawName).toLowerCase() !== username.toLowerCase();
  const hasAt = rawName.startsWith("@");

  if (wrongArea || wrongPerson) {
    return <Navigate to={panel} replace />;
  }

  // /ali/orders (old link, no @) -> /@ali/orders, keeping the page, ?query and #hash
  if (area === "user" && !hasAt) {
    const pathname = location.pathname.replace(/^\/[^/]+/, PATHS.user.overview(username));
    return <Navigate to={{ pathname, search: location.search, hash: location.hash }} replace />;
  }
  // staff never use an @ in /team/:username
  if (area === "admin" && hasAt) {
    return <Navigate to={panel} replace />;
  }

  return <Outlet />;
}