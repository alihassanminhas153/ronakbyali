import { Link, NavLink, Outlet } from "react-router";
import useSession from "../router/useSession";
import { PATHS } from "../router/path";

// User dashboard shell. Renders <Outlet /> by default, or `children` (SlugRoute).
export default function AccountLayout({ children }) {
  const { username } = useSession();

  return (
    <div className="account-shell">
      <aside>
        <Link to={PATHS.home}>← Store</Link>
        <NavLink to={PATHS.user.overview(username)} end>Overview</NavLink>
        <NavLink to={PATHS.user.profile(username)}>Profile</NavLink>
        <NavLink to={PATHS.user.orders(username)}>Orders</NavLink>
        <NavLink to={PATHS.user.cart(username)}>Cart</NavLink>
        <NavLink to={PATHS.user.wishlist(username)}>Wishlist</NavLink>
        <NavLink to={PATHS.user.reviews(username)}>Reviews</NavLink>
        <NavLink to={PATHS.user.alerts(username)}>Alerts</NavLink>
      </aside>
      <section>{children ?? <Outlet />}</section>
    </div>
  );
}