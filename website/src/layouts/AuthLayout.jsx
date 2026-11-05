import { Link, Outlet } from "react-router";
import { PATHS } from "../router/path";

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <Link to={PATHS.home}>Store</Link>
      <main className="auth-card">
        <Outlet />
      </main>
    </div>
  );
}