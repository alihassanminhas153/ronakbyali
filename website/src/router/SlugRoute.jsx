import { useParams } from "react-router";
import useSession from "./useSession";
import MainLayout from "../layouts/MainLayout";
import AccountLayout from "../layouts/AccountLayout";
import Product from "../pages/shared/products/Product";
import UserOverview from "../pages/user/dashboard/Overview";

/**
 * Handles the single-segment URL  /:something
 *  - it is the logged-in person's own username -> their dashboard overview
 *  - anything else                             -> short product link (/:productId)
 */
export default function SlugRoute() {
  const { username: slug } = useParams();
  const { isReady, isLoggedIn, username } = useSession();

  if (!isReady) return null;

  if (isLoggedIn && slug.toLowerCase() === username.toLowerCase()) {
    return (
      <AccountLayout>
        <UserOverview />
      </AccountLayout>
    );
  }

  return (
    <MainLayout>
      <Product />
    </MainLayout>
  );
}