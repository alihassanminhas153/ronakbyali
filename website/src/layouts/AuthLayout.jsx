import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <main className="auth-card">
        <Outlet />
      </main>
    </div>
  );
}