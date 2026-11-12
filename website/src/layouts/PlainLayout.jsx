import { Outlet } from "react-router";
import Header from "../components/shared/header/Header";

// Public pages (everything except Home, which keeps MainLayout) with the site header on top.
// Works both as a route layout (<Outlet />) and wrapping children (see SlugRoute).
export default function PlainLayout({ children, pages = [] }) {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <Header pages={pages} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}