import { Outlet } from "react-router";

// Renders <Outlet /> by default, or `children` when used directly (SlugRoute).
export default function MainLayout({ children }) {
  return (
    <>
      <main>{children ?? <Outlet />}</main>

      <footer />
    </>
  );
}