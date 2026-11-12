import { Outlet } from "react-router";
import Header from "../components/shared/header/Header";

// Renders <Outlet /> by default, or `children` when used directly (SlugRoute).
export default function MainLayout({ children, pages = [] }) {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <Header pages={pages} />
      <main>{children ?? <Outlet />}</main>
      <footer />
    </div>
  );
}