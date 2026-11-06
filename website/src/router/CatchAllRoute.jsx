import { Navigate, useLocation } from "react-router";
import useSession from "./useSession";
import { PATHS } from "./path";
import NotFound from "../pages/shared/structure/NotFound";

// Last route (path="*"): a URL that no route in App.jsx matches.
//  - logged in  -> their own panel (staff -> /team/:username, others -> /:username)
//  - logged out -> /welcome-back for anything under /team, the normal 404 page otherwise
export default function CatchAllRoute() {
  const { isReady, isLoggedIn, panel } = useSession();
  const location = useLocation();

  if (!isReady) return null;
  if (isLoggedIn) return <Navigate to={panel} replace />;
  if (/^\/team(\/|$)/i.test(location.pathname)) {
    return <Navigate to={PATHS.signin} replace state={{ from: location }} />;
  }
  return <NotFound />;
}