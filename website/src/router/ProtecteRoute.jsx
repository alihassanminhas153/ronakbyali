import { Navigate, Outlet, useLocation, useParams } from "react-router";
import useSession from "./useSession";
import { PATHS } from "./path";

/**
 * Guards dashboards.  <ProtectedRoute area="user" />  or  area="admin"
 *  1. logged out -> /welcome-back (remembers where they were going)
 *  2. every person has exactly ONE panel, so anything else goes to it:
 *       staff (admin / support / manager)  -> /team/:username   (never /:username)
 *       everyone else                      -> /:username        (never /team/...)
 *  3. someone else's username in the URL -> their own panel
 */
export default function ProtectedRoute({ area = "user" }) {
  const { isReady, isLoggedIn, username, isStaff, panel } = useSession();
  const { username: urlUsername } = useParams();
  const location = useLocation();

  if (!isReady) return null;

  if (!isLoggedIn) {
    return <Navigate to={PATHS.signin} replace state={{ from: location }} />;
  }

  const wrongArea = (area === "admin") !== isStaff;
  const wrongPerson = urlUsername?.toLowerCase() !== username.toLowerCase();
  if (wrongArea || wrongPerson) {
    return <Navigate to={panel} replace />;
  }

  return <Outlet />;
}