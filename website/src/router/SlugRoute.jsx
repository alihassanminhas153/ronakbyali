import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router";
import useSession from "./useSession";
import { PATHS, RESERVED_USERNAMES } from "./path";
import { productExists } from "./productLookup";
import PlainLayout from "../layouts/PlainLayout";
import AccountLayout from "../layouts/AccountLayout";
import Product from "../pages/shared/products/Product";
import UserOverview from "../pages/user/dashboard/Overview";

/**
 * Handles the single-segment URL  /:something
 *  - the logged-in customer's own username -> their dashboard overview
 *  - the logged-in staff member's username -> their admin panel (staff have no /:username)
 *  - a reserved word (e.g. /team)          -> their panel, or login when logged out
 *  - anything else                         -> short product link (/:productId) if that
 *    product exists, otherwise their panel (logged in) or /welcome-back (logged out)
 */
export default function SlugRoute() {
  const { username: slug } = useParams();
  const { isReady, isLoggedIn, username, isStaff, panel } = useSession();
  const [lookup, setLookup] = useState({ slug: null, found: null });

  const key = slug.toLowerCase();
  const isOwn = isLoggedIn && key === username.toLowerCase();
  const isReserved = RESERVED_USERNAMES.includes(key);
  const needsLookup = isReady && !isOwn && !isReserved;

  // where a URL that leads nowhere sends the visitor
  const fallback = isLoggedIn ? panel : PATHS.signin;

  useEffect(() => {
    if (!needsLookup) return undefined;
    let cancelled = false;
    productExists(slug).then((found) => {
      if (!cancelled) setLookup({ slug, found });
    });
    return () => {
      cancelled = true;
    };
  }, [needsLookup, slug]);

  if (!isReady) return null;

  if (isReserved) return <Navigate to={fallback} replace />;

  if (isOwn) {
    if (isStaff) return <Navigate to={panel} replace />;
    return (
      <AccountLayout>
        <UserOverview />
      </AccountLayout>
    );
  }

  if (lookup.slug !== slug) return null; // still checking
  if (!lookup.found) return <Navigate to={fallback} replace />;

  return (
    <PlainLayout>
      <Product />
    </PlainLayout>
  );
}