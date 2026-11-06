import DashboardShell from "../../../components/shared/DashboardShell";

// Admin panel (admin, support, manager): the same shared sidebar, admin links.
export default function AdminLayout() {
  return <DashboardShell area="admin" />;
}