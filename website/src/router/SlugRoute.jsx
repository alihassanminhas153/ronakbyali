import { Navigate, useParams } from "react-router";
import useSession from "./useSession";
import { stripAt } from "./path";
import AccountLayout from "../layouts/AccountLayout";
import NotFound from "../pages/shared/structure/NotFound";
import UserOverview from "../pages/user/dashboard/Overview";

/**
 * Handles dashboard URLs under /p/:username. Product slugs live at the site root.
 */
export default function SlugRoute() {
  const { username: slug = "" } = useParams();
  const { isReady, isLoggedIn, username, isStaff, panel } = useSession();

  if (!isReady) return null;

  const isOwn = isLoggedIn && stripAt(slug).toLowerCase() === String(username || "").toLowerCase();
  if (isOwn && slug.startsWith("@")) {
    if (isStaff) return <Navigate to={panel} replace />;
    return (
      <AccountLayout>
        <UserOverview />
      </AccountLayout>
    );
  }

  if (isOwn) return <Navigate to={panel} replace />;
  return <NotFound />;
}