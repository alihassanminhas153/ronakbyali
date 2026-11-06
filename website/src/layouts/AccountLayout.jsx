import DashboardShell from "../components/shared/DashboardShell";

// Customer dashboard: shared sidebar + content. No site header.
// Used as a route layout (Outlet) and with children (SlugRoute).
export default function AccountLayout({ children }) {
  return <DashboardShell area="user">{children}</DashboardShell>;
}