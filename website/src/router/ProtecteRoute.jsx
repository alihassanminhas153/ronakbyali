import { Navigate, Outlet, useLocation, useParams } from "react-router";
import useSession from "./useSession";
import { PATHS, dashboardHome } from "./path";

/**
 * Guards dashboards.  <ProtectedRoute area="user" />  or  area="admin"
 *  1. logged out            -> /welcome-back (remembers where they were going)
 *  2. admin area, not admin -> their own user dashboard
 *  3. username in URL isn't theirs -> their own dashboard root
 */
export default function ProtectedRoute({ area = "user" }) {
  const { isReady, isLoggedIn, username, isAdmin } = useSession();
  const { username: urlUsername } = useParams();
  const location = useLocation();

  if (!isReady) return null;

  if (!isLoggedIn) {
    return <Navigate to={PATHS.signin} replace state={{ from: location }} />;
  }

  if (area === "admin" && !isAdmin) {
    return <Navigate to={PATHS.user.overview(username)} replace />;
  }

  if (urlUsername?.toLowerCase() !== username.toLowerCase()) {
    const own =
      area === "admin" ? PATHS.admin.overview(username) : PATHS.user.overview(username);
    return <Navigate to={own} replace />;
  }

  return <Outlet />;
}